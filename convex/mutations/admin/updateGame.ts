// convex/mutations/admin/updateGame.ts (panel admin)
// Detecta cambios en un juego, registra notificaciones y envía push via Expo.

import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { updateGameCore } from "../../lib/gameCore";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

const PatchValidator = v.object({
  title: v.optional(v.union(v.string(), v.null())),
  description: v.optional(v.union(v.string(), v.null())),
  cover_url: v.optional(v.union(v.string(), v.null())),
  trailer_url: v.optional(v.union(v.string(), v.null())),
  extraTrailerUrl: v.optional(v.union(v.string(), v.null())),
  extraImages: v.optional(v.array(v.string())),
  genres: v.optional(v.array(v.string())),

  purchasePrice: v.optional(v.union(v.float64(), v.string(), v.null())),
  weeklyPrice: v.optional(v.union(v.float64(), v.string(), v.null())),

  embed_url: v.optional(v.union(v.string(), v.null())),
  embed_allow: v.optional(v.union(v.string(), v.null())),
  embed_sandbox: v.optional(v.union(v.string(), v.null())),

  plan: v.optional(v.union(v.literal("free"), v.literal("premium"))),
});

function equalish(a: any, b: any) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    try {
      return JSON.stringify(a || []) === JSON.stringify(b || []);
    } catch {
      return false;
    }
  }
  if (typeof a === "object" || typeof b === "object") {
    try {
      return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
    } catch {
      return false;
    }
  }
  const an = Number(a),
    bn = Number(b);
  if (!Number.isNaN(an) && !Number.isNaN(bn)) return an === bn;
  return String(a ?? "") === String(b ?? "");
}

function moneyLabel(v: any) {
  if (v == null) return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  try {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export const updateGame = mutation({
  args: {
    gameId: v.id("games"),
    requesterId: v.optional(v.id("profiles")),

    title: v.optional(v.union(v.string(), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
    cover_url: v.optional(v.union(v.string(), v.null())),
    trailer_url: v.optional(v.union(v.string(), v.null())),
    extraTrailerUrl: v.optional(v.union(v.string(), v.null())),
    extraImages: v.optional(v.array(v.string())),
    genres: v.optional(v.array(v.string())),
    purchasePrice: v.optional(v.union(v.float64(), v.string(), v.null())),
    weeklyPrice: v.optional(v.union(v.float64(), v.string(), v.null())),
    embed_url: v.optional(v.union(v.string(), v.null())),
    embed_allow: v.optional(v.union(v.string(), v.null())),
    embed_sandbox: v.optional(v.union(v.string(), v.null())),
    plan: v.optional(v.union(v.literal("free"), v.literal("premium"))),

    patch: v.optional(PatchValidator),
  },
  handler: async ({ db, scheduler }, args) => {
    const { patch, ...top } = args as any;
    const merged = patch ? { ...top, ...patch } : top;

    const before = await db.get(args.gameId);
    const result = await updateGameCore(db, merged);
    const after = await db.get(args.gameId);

    const watchedFields = [
      "title",
      "description",
      "cover_url",
      "trailer_url",
      "extraTrailerUrl",
      "extraImages",
      "genres",
      "purchasePrice",
      "weeklyPrice",
      "embed_url",
      "embed_allow",
      "embed_sandbox",
      "plan",
    ];

    const changes: { field: string; before: any; after: any }[] = [];
    for (const f of watchedFields) {
      const b = before ? (before as any)[f] : undefined;
      const a = after ? (after as any)[f] : undefined;
      if (!equalish(b, a)) changes.push({ field: f, before: b, after: a });
    }

    if (changes.length === 0) return result;

    const now = Date.now();

    const planFinal = (after as any)?.plan ?? (before as any)?.plan ?? "free";
    const roleTargets =
      planFinal === "premium" ? ["premium", "admin"] : ["free", "premium", "admin"];

    // Usuarios para la tabla notifications
    const usersToNotify = await db
      .query("profiles")
      .filter((q) => q.or(...roleTargets.map((role) => q.eq(q.field("role"), role))))
      .collect();

    // Tokens push de roles implicados
    let tokensForRoles: any[] = [];
    try {
      const ids = new Set(usersToNotify.map((u) => u._id));
      tokensForRoles = (await db.query("pushTokens").collect()).filter(
        (t) => !t.disabledAt && t.profileId && ids.has(t.profileId)
      );
    } catch (err) {
      console.error("updateGame load tokens error", err);
    }

    // Detectamos altas/bajas para decidir si disparamos push Expo
    const isNew = !before && !!after;
    const isRemoved = !!before && !after;
    const sendPush = isNew || isRemoved;
    const titleBase = (after as any)?.title ?? (before as any)?.title ?? "Juego";

    for (const change of changes) {
      const f = change.field;
      let titleMsg = `Actualización: ${titleBase}`;
      let message = `Se actualizó ${f}.`;

      if (f === "purchasePrice") {
        titleMsg = `Precio de compra actualizado: ${titleBase}`;
        message = `Precio compra: ${moneyLabel(change.before)} → ${moneyLabel(change.after)}`;
      } else if (f === "weeklyPrice") {
        titleMsg = `Precio de alquiler actualizado: ${titleBase}`;
        message = `Precio alquiler: ${moneyLabel(change.before)} → ${moneyLabel(change.after)}`;
      } else if (f === "description") {
        titleMsg = `Descripción actualizada: ${titleBase}`;
        message = `Se actualizó la descripción del juego.`;
      }

      // Insertamos notificación interna para cada usuario
      for (const user of usersToNotify) {
        await db.insert("notifications", {
          userId: user._id,
          type: "game-update",
          title: titleMsg,
          message,
          gameId: args.gameId,
          transactionId: undefined,
          isRead: false,
          readAt: undefined,
          createdAt: now,
          meta: {
            field: f,
            before: change.before,
            after: change.after,
            updatedBy: args.requesterId ?? null,
          },
        });
      }

      // Notificación al admin que hizo el cambio
      if (args.requesterId) {
        await db.insert("notifications", {
          userId: args.requesterId,
          type: "game-update",
          title: titleMsg,
          message,
          gameId: args.gameId,
          transactionId: undefined,
          isRead: false,
          readAt: undefined,
          createdAt: now,
          meta: {
            field: f,
            before: change.before,
            after: change.after,
            updatedBy: args.requesterId ?? null,
          },
        });

        if (sendPush && scheduler && tokensForRoles.length) {
          const adminTokens = tokensForRoles
            .filter((t: any) => String(t.profileId) === String(args.requesterId))
            .map((t: any) => t.token);
          if (adminTokens.length) {
            const expoPushAction = (api as any).actions?.expoPush?.send;
            if (expoPushAction) {
              scheduler.runAfter(0, expoPushAction, {
                tokens: adminTokens,
                title: titleMsg,
                body: message,
                data: {
                  type: "game-update",
                  meta: { gameId: String(args.gameId), field: f },
                },
                androidColor: "#ff6600",
              }).catch((err: unknown) => console.error(err));
            }
          }
        }
      }
    }

    // Push general a roles objetivo
    if (sendPush && scheduler && tokensForRoles.length) {
      try {
        const titleBase = (after as any)?.title ?? (before as any)?.title ?? "Catálogo";
        const data = {
          type: isNew ? "game-added" : "game-removed",
          gameId: String(args.gameId),
          coverUrl: (after as any)?.cover_url ?? (before as any)?.cover_url ?? null,
          fields: changes.map((c) => c.field),
          plan: planFinal,
        };
        const payload = {
          tokens: tokensForRoles.map((t: any) => t.token),
          title: isNew ? `Nuevo juego: ${titleBase}` : `Juego retirado: ${titleBase}`,
          body: isNew ? `Disponible ahora en PlayVerse` : `Ya no está en el catálogo`,
          data,
          androidColor: "#ff6600", // naranja PlayVerse
        };
        const expoPushAction = (api as any).actions?.expoPush?.send;
        if (expoPushAction) {
          scheduler
            .runAfter(0, expoPushAction, payload)
            .catch((err: unknown) => console.error(err));
        }
      } catch (err) {
        console.error("updateGame push scheduling (roles) error", err);
      }
    }

    return result;
  },
});
