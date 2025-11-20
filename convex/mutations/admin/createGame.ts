// convex/mutations/admin/createGame.ts
// Crea juego y dispara notificaciones/push en alta.

import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { createGameCore } from "../../lib/gameCore";
import type { Id } from "../../_generated/dataModel";
import { api } from "../../_generated/api";

export const createGame = mutation({
  args: {
    requesterId: v.optional(v.id("profiles")),

    title: v.string(),
    plan: v.union(v.literal("free"), v.literal("premium")),

    description: v.optional(v.union(v.string(), v.null())),
    cover_url: v.optional(v.union(v.string(), v.null())),
    trailer_url: v.optional(v.union(v.string(), v.null())),

    extraTrailerUrl: v.optional(v.union(v.string(), v.null())),
    extraImages: v.optional(v.array(v.string())),
    genres: v.optional(v.array(v.string())),

    weeklyPrice: v.optional(v.union(v.number(), v.string(), v.null())),
    purchasePrice: v.optional(v.union(v.number(), v.string(), v.null())),

    embed_url: v.optional(v.union(v.string(), v.null())),
    embedUrl: v.optional(v.union(v.string(), v.null())),
    embed_allow: v.optional(v.union(v.string(), v.null())),
    embedAllow: v.optional(v.union(v.string(), v.null())),
    embed_sandbox: v.optional(v.union(v.string(), v.null())),
    embedSandbox: v.optional(v.union(v.string(), v.null())),
  },
  handler: async ({ db, scheduler }, args) => {
    const res = await createGameCore(db, args);

    const gameId = (res as any)?.gameId ?? res ?? null;
    const game = gameId ? await db.get(gameId as Id<"games">) : null;
    if (!game) return res;

    const planFinal = (game as any)?.plan ?? "free";
    const roleTargets =
      planFinal === "premium" ? ["premium", "admin"] : ["free", "premium", "admin"];

    const usersToNotify = await db
      .query("profiles")
      .filter((q) => q.or(...roleTargets.map((role) => q.eq(q.field("role"), role))))
      .collect();

    const now = Date.now();
    const titleMsg = `Nuevo juego: ${game.title}`;
    const message = `Disponible ahora en PlayVerse`;

    for (const user of usersToNotify) {
      await db.insert("notifications", {
        userId: user._id,
        type: "new-game",
        title: titleMsg,
        message,
        gameId: gameId as Id<"games">,
        transactionId: undefined,
        isRead: false,
        readAt: undefined,
        createdAt: now,
        meta: {
          plan: planFinal,
          createdBy: args.requesterId ?? null,
        },
      });
    }

    const ids = new Set(usersToNotify.map((u) => u._id));
    const tokens = (await db.query("pushTokens").collect()).filter(
      (t) => !t.disabledAt && t.profileId && ids.has(t.profileId)
    );

    if (scheduler && tokens.length) {
      const expoPushAction = (api as any).actions?.expoPush?.send;
      if (expoPushAction) {
        scheduler
          .runAfter(0, expoPushAction, {
            tokens: tokens.map((t) => t.token),
            title: titleMsg,
            body: message,
            data: {
              type: "game-added",
              gameId: String(gameId),
              coverUrl: (game as any)?.cover_url ?? null,
              plan: planFinal,
            },
            androidColor: "#ff6600",
          })
          .catch((err: unknown) => console.error(err));
      }
    }

    return res;
  },
});
