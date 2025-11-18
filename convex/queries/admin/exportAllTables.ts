import { query } from "../../_generated/server";
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

export const exportAllTables = query({
  args: { tables: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    const target = args.tables && args.tables.length > 0 ? args.tables : TABLES;
    const allowed = new Set(TABLES);

    const result: Array<{ table: string; rows: any[] }> = [];
    for (const table of target) {
      if (!allowed.has(table)) continue;
      const rows = await ctx.db.query(table as any).collect();
      result.push({ table, rows });
    }
    return result;
  },
});
