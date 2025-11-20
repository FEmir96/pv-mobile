"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";

const EXPO_API = "https://api.expo.dev/v2/push/send";

export const send = action({
  args: {
    tokens: v.array(v.string()),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
    androidColor: v.optional(v.string()),
  },
  handler: async (ctx, { tokens, title, body, data, androidColor }) => {
    if (!tokens.length) return { ok: true, sent: 0 };

    const messages = tokens.map((to) => ({
      to,
      title,
      body,
      data,
      sound: null,
      android: androidColor ? { color: androidColor } : undefined,
    }));

    const res = await fetch(EXPO_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    const json = await res.json();
    return { ok: res.ok, status: res.status, json };
  },
});
