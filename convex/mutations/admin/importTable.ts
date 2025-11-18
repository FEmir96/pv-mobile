import { mutation } from "../../_generated/server";
import { v } from "convex/values";

const TABLES = [
  "profiles",
  "games",
  "transactions",
  "payments",
  "upgrades",
  "subscriptions",
  "scores",
  "favorites",
  "notifications",
  "pushTokens",
  "houseAds",
  "adEvents",
  "contactMessages",
  "cartItems",
  "passwordResetTokens",
  "library",
  "rentals",
  "purchases",
];

export const importTable = mutation({
  args: {
    table: v.string(),
    rows: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    if (!TABLES.includes(args.table)) {
      throw new Error("Tabla no permitida");
    }
    for (const row of args.rows) {
      if (!row || typeof row !== "object") continue;
      // No arrastramos _id ni _creationTime
      const { _id, _creationTime, ...data } = row as Record<string, unknown>;
      await ctx.db.insert(args.table as any, data);
    }
    return { ok: true, inserted: args.rows.length };
  },
});
