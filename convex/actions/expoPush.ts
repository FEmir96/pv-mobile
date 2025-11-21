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
    const cleanTokens = tokens
      .map((t) => (t || "").trim())
      .filter((t) => t.length > 0);
    if (!cleanTokens.length) {
      return { ok: false, reason: "no_valid_tokens" as const };
    }

    const messages = cleanTokens.map((to) => ({
      to,
      title,
      body,
      data,
      sound: null,
      android: androidColor ? { color: androidColor } : undefined,
    }));

    // Expo push API espera un array de mensajes en el cuerpo (no envuelve en { messages }).
    const res = await fetch(EXPO_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error("expoPush error", res.status, json);
    }

    return { ok: res.ok, status: res.status, json };
  },
});
