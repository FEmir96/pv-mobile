// convex/mutations/admin/deleteGame.ts
// Elimina juego y dispara notificaciones/push en baja.

import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { deleteGameCore } from "../../lib/gameCore";
import type { Id } from "../../_generated/dataModel";
import { api } from "../../_generated/api";

export const deleteGame = mutation({
  args: {
    id: v.id("games"),
    requesterId: v.optional(v.id("profiles")),
  },
  handler: async ({ db, scheduler }, { id, requesterId }) => {
    const before = await db.get(id);
    const res = await deleteGameCore(db, { gameId: id, requesterId });

    if (before) {
      const planFinal = (before as any)?.plan ?? "free";
      const roleTargets =
        planFinal === "premium" ? ["premium", "admin"] : ["free", "premium", "admin"];

      const usersToNotify = await db
        .query("profiles")
        .filter((q) => q.or(...roleTargets.map((role) => q.eq(q.field("role"), role))))
        .collect();

      const now = Date.now();
      const titleMsg = `Juego retirado: ${(before as any)?.title ?? "Juego"}`;
      const message = `Ya no está en el catálogo`;

      for (const user of usersToNotify) {
        await db.insert("notifications", {
          userId: user._id,
          type: "game-update",
          title: titleMsg,
          message,
          gameId: id,
          transactionId: undefined,
          isRead: false,
          readAt: undefined,
          createdAt: now,
          meta: {
            plan: planFinal,
            deletedBy: requesterId ?? null,
          },
        });
      }

      try {
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
                  type: "game-removed",
                  gameId: String(id),
                  coverUrl: (before as any)?.cover_url ?? null,
                  plan: planFinal,
                },
                androidColor: "#ff6600",
              })
              .catch((err: unknown) => console.error(err));
          }
        }
      } catch (err) {
        console.error("deleteGame push scheduling error", err);
      }
    }

    return res;
  },
});


