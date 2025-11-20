import { query } from "../_generated/server";
import { v } from "convex/values";

export const tokensForRoles = query({
  args: {
    roles: v.array(v.string()),
  },
  handler: async ({ db }, { roles }) => {
    const roleSet = new Set(roles);
    const profiles = await db
      .query("profiles")
      .filter((q) => q.or(...roles.map((role) => q.eq(q.field("role"), role))))
      .collect();

    const ids = new Set(profiles.map((p) => p._id));
    const allTokens = await db.query("pushTokens").collect();
    return allTokens.filter(
      (t) => !t.disabledAt && t.profileId && ids.has(t.profileId)
    );
  },
});
