// playverse/playverse-mobile/src/lib/convexClient.ts
import { ConvexReactClient } from 'convex/react';
import { ConvexHttpClient } from 'convex/browser';

export const CONVEX_URL =
  process.env.EXPO_PUBLIC_CONVEX_URL ??
  'https://quirky-squirrel-924.convex.cloud';

export const convex = new ConvexReactClient(CONVEX_URL);
export const convexHttp = new ConvexHttpClient(CONVEX_URL);
