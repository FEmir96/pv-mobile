# PlayVerse Mobile 🎮📱

App movil de PlayVerse (Expo + React Native) para explorar catalogo, ver fichas, alquilar/comprar, gestionar perfil y recibir notificaciones push. Usa Convex como backend en tiempo real y soporta login por Google, Microsoft y credenciales.

## 🧭 Que hay en este repo
- `playverse-mobile/`: fuente principal de la app (Expo).
- `convex/`: funciones, queries y acciones compartidas (Convex Cloud). No es obligatorio levantarlo local si apuntas al deployment remoto.

## 🛠️ Prerrequisitos
- Node.js 18+ y npm.
- Expo CLI (instalada via `npm i -g expo`) o usar `npx expo` directamente.
- Android SDK para correr en emulador/dispositivo; Xcode si vas a probar iOS nativo.

## 🔑 Variables de entorno (ponlas en `playverse-mobile/.env.local`)
Necesarias para que arranque autenticacion y datos:
- `EXPO_PUBLIC_CONVEX_URL` (o `CONVEX_URL`): URL de tu deployment Convex.
- `EXPO_PUBLIC_WEB_URL` / `NEXTAUTH_URL`: base de la web para callbacks OAuth (ej. `http://localhost:3000`).
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` y `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID`: credenciales OAuth Google (web/native).
- `EXPO_PUBLIC_MICROSOFT_CLIENT_ID`, `EXPO_PUBLIC_MICROSOFT_EXPO_CLIENT_ID`, `EXPO_PUBLIC_MICROSOFT_TENANT_ID`: credenciales Microsoft/Entra.
- `EXPO_PUBLIC_WEB_ASSET_BASE`: opcional, CDN/base para assets web.
- `GOOGLE_SERVICES_JSON`: ruta al `google-services.json` para FCM (por defecto `./google-services.json` local).
- Opcional: `EXPO_USE_NATIVE=1` si usas Dev Client/EAS build.

Ejemplo rapido:
```env
EXPO_PUBLIC_CONVEX_URL=https://<tu-convex>.convex.cloud
EXPO_PUBLIC_WEB_URL=http://localhost:3000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
EXPO_PUBLIC_MICROSOFT_EXPO_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
EXPO_PUBLIC_MICROSOFT_TENANT_ID=common
EXPO_PUBLIC_WEB_ASSET_BASE=http://localhost:3000
GOOGLE_SERVICES_JSON=./google-services.json
```
- Los valores reales (client IDs, secretos, keys) van en tu `.env.local` privado; no se suben al repo. Usa los que ya tengan el equipo o Vault interno.

## 🚀 Como levantarlo local
1) `cd playverse-mobile`
2) `npm install`
3) Asegurate de tener el `.env.local` listo (ver arriba). Sin credenciales OAuth el login social fallara.
4) Corre en modo Expo Go/web: `npm run start`
   - Android nativo: `npm run android` (requiere Android SDK y google-services.json valido).
   - iOS nativo: `npm run ios` (requiere macOS + Xcode).
   - Web: `npm run web` (bundler metro-web).
5) Backend opcional 👾: desde la raiz del repo (`pv-mobile/`) ejecuta `npm run dev:convex` si quieres usar un Convex local en vez del deployment remoto.

## 🧱 Estructura clave
- `src/App.tsx`: monta providers (Convex, Auth, Favorites), deep linking `playverse://` y NavigationContainer.
- `src/navigation/`: stacks + tabs (`AppNavigator`, `BottomTabBar`).
- `src/screens/`: pantallas de negocio (Home, Catalogo, GameDetail, Premium, Notifications, MyGames, AuthCallback, Perfil).
- `src/context/`: estado global (Auth con SecureStore + Favorites).
- `src/api/`: wrappers a Convex para auth y juegos.
- `src/lib/`: clientes Convex, buses, push notifications, helpers.
- `src/components/`: UI reusable (🪙 banners premium, 🎮 cards, 👾 header/tabbar, 🌟 gestor de push).
- `src/styles/`, `constants/`, `types/`, `utils/`: tema, constantes, tipos y utilidades.
- `assets/`: iconos, ilustraciones, fuentes, splash.
- Config: `app.config.js` (Expo/EAS), `eas.json`, `tailwind.config.js`, `metro.config.js`.
- `android/`: proyecto nativo generado (para builds y permisos push).

## 🔌 Detalles tecnicos y APIs
- Datos en tiempo real con Convex; el cliente usa `EXPO_PUBLIC_CONVEX_URL` y cae en el fallback si no lo seteas.
- Auth y cuentas: mutaciones Convex `auth:createUser`, `auth:authLogin` y `auth:oauthUpsert` (via web). Sesion basica persistida con SecureStore (TTL 7 dias).
- Favoritos y libreria: mutaciones/queries de Convex (`toggleFavorite`, `getUserLibrary`, etc.), gestionadas via providers.
- Push notifications: Expo Notifications + FCM (Android). Los tokens se guardan en Convex (`pushTokens.ts`) y se envian via acciones/cron en `convex/notifications.ts`.
- Deep linking: esquema `playverse://auth/callback` configurado en `app.config.js` (tambien soporta esquemas de Google para OAuth nativo).
- Assets web: si usas `EXPO_PUBLIC_WEB_ASSET_BASE`, la app servira assets desde esa base en web preview.
- Estado esperado al levantar local: la home muestra el catalogo obtenido desde Convex remoto; login social funciona solo si las claves OAuth y `google-services.json` estan configurados. Sin credenciales, la app arranca pero las acciones protegidas fallaran.

## 🌟 Dependencias principales
- Expo 54 + React Native 0.81.
- React Navigation (stack + bottom tabs) y Gesture Handler.
- Convex (`convex/react`, `convex/browser`) para queries/mutaciones.
- Expo Auth Session / WebBrowser para OAuth; SecureStore para sesion.
- Expo Notifications, Device, Application para push y device info ligera.
- NativeWind + TailwindCSS para estilos utility-first.
- Extras multimedia/web: `react-native-webview`, `expo-av`/`expo-video`, `expo-linear-gradient`, `@expo/vector-icons`.
