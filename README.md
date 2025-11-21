# PlayVerse Mobile 🎮📱

App móvil de PlayVerse para explorar el catálogo, alquilar/comprar juegos y gestionar tu perfil desde iOS, Android o web. Incluye login por Google/Microsoft/email, favoritos sincronizados vía Convex y notificaciones push.

## 🚀 Cómo levantarlo local
1) Instala dependencias en la app:  
   ```bash
   cd playverse-mobile
   npm install
   ```
2) Configura variables en `playverse-mobile/.env.local` (o en tu entorno):  
   - `EXPO_PUBLIC_CONVEX_URL` → backend Convex.  
   - `EXPO_PUBLIC_WEB_URL` / `NEXTAUTH_URL` → URL de la web para callbacks OAuth.  
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID` y `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID`.  
   - `EXPO_PUBLIC_MICROSOFT_CLIENT_ID`, `EXPO_PUBLIC_MICROSOFT_EXPO_CLIENT_ID`, `EXPO_PUBLIC_MICROSOFT_TENANT_ID`.  
   - `EXPO_PUBLIC_WEB_ASSET_BASE` si sirves assets estáticos desde CDN.  
   - `GOOGLE_SERVICES_JSON` si usas un `google-services.json` remoto en EAS (en dev hay uno local).
3) Inicia el bundler:  
   ```bash
   npm run start          # Expo Go / web
   npm run android        # build nativo
   npm run ios            # build nativo
   npm run web            # preview web
   ```
4) Opcional 🪙: si querés levantar Convex en local (en lugar del deployment en la nube), usa `npm run dev:convex` desde la raíz del repo con tu `CONVEX_DEPLOYMENT`.

## 🧭 Estructura de carpetas
- `playverse-mobile/src/App.tsx`: monta proveedores (Convex, Auth, Favorites) y navegación con deep links `playverse://`.
- `playverse-mobile/src/navigation/`: stacks + tabs (`AppNavigator`, `BottomTabBar`) para Home, Catálogo, Favoritos, Perfil, etc.
- `playverse-mobile/src/screens/`: pantallas de negocio (Home, Catálogo, GameDetail, Premium, Notifications, MyGames, AuthCallback).
- `playverse-mobile/src/context/`: estado global (autenticación y favoritos persistentes con SecureStore).
- `playverse-mobile/src/api/`: wrappers hacia Convex para auth y juegos.
- `playverse-mobile/src/lib/`: clientes (`convexClient`), buses de eventos, push notifications, utilidades runtime.
- `playverse-mobile/src/components/`: UI reutilizable (🪙 banners premium, 🎮 cards, 👾 header/tabbar, 🌟 gestor de push).
- `playverse-mobile/src/styles/`, `constants/`, `types/`, `utils/`: tema, constantes y types compartidos.
- `playverse-mobile/assets/`: iconos, ilustraciones y fuentes.
- `app.config.js`, `eas.json`, `tailwind.config.js`, `metro.config.js`: configuración de Expo, EAS y NativeWind.
- `android/`: proyecto nativo generado (necesario para notificaciones y builds de tienda).

## 🌟 Dependencias principales
- Expo 54 + React Native 0.81 (metro web bundler habilitado).
- React Navigation (stack + bottom tabs) y Gesture Handler.
- Convex (`convex/react`, `convex/browser`) para datos en tiempo real y mutaciones.
- Expo Auth Session / WebBrowser para OAuth y deep linking; SecureStore para sesión.
- Expo Notifications, Device y Application para push y telemetry ligera.
- NativeWind + TailwindCSS para estilos tipo utility-first.
- Extras multimedia: `react-native-webview`, `expo-av`/`expo-video`, `expo-linear-gradient`, `@expo/vector-icons`.
