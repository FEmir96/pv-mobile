// playverse/playverse-mobile/app.config.js
import "dotenv/config";

const USE_NATIVE = process.env.EXPO_USE_NATIVE === "1";

export default {
  expo: {
    name: "PlayVerse Mobile",
    slug: "playverse-mobile",
    owner: "fernandoemir",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "playverse",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.playverse.app",
      deploymentTarget: "15.1",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.playverse.app",
      // Estos permisos se aplican solo en builds nativas; Expo Go los ignora.
      permissions: [
        "INTERNET",
        "WAKE_LOCK",
        "RECEIVE_BOOT_COMPLETED",
        "POST_NOTIFICATIONS",
      ],
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/favicon.png",
    },

    // ✅ Plugins solo si EXPO_USE_NATIVE=1 (Dev Client / Production / Preview)
    plugins: USE_NATIVE
      ? [
          "expo-web-browser",
          "expo-notifications",
          // tu plugin custom si lo usás:
          "./plugins/withPushy",
          [
            "expo-build-properties",
            {
              android: {
                extraMavenRepos: ["https://repo.pushy.me"],
              },
            },
          ],
        ]
      : [
          // En Expo Go podemos dejar plugins “puros” si querés, pero no hace falta ninguno.
        ],

    extra: {
      convexUrl: process.env.CONVEX_URL || process.env.EXPO_PUBLIC_CONVEX_URL,
      webAuthUrl:
        process.env.EXPO_PUBLIC_WEB_URL ||
        process.env.NEXTAUTH_URL ||
        "http://localhost:3000",
      webAssetBase: process.env.EXPO_PUBLIC_WEB_ASSET_BASE,
      googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      googleExpoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
      microsoftClientId: process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID,
      microsoftExpoClientId: process.env.EXPO_PUBLIC_MICROSOFT_EXPO_CLIENT_ID,
      microsoftTenantId: process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID,
      auth: {
        google: {
          expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
          clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
        },
        microsoft: {
          expoClientId: process.env.EXPO_PUBLIC_MICROSOFT_EXPO_CLIENT_ID,
          clientId: process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID,
          tenantId: process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID,
        },
      },
      eas: {
        projectId: "4dae069c-2e28-4075-a5be-4dea3c345351",
      },
      // Para inspección en runtime si hace falta:
      useNative: USE_NATIVE,
    },
  },
};
