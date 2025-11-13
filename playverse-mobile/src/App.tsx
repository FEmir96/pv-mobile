import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ConvexProvider } from 'convex/react';
import { convex } from './lib/convexClient';
import { AuthProvider } from './context/AuthContext';
import AppNavigator, { type RootStackParamList } from './navigation/AppNavigator';
import { FavoritesProvider } from './context/FavoritesContext';
import PushNotificationsManager from './components/PushNotificationsManager';

// ✅ Llamar una sola vez, a nivel de módulo (evita bucles)
try { WebBrowser.maybeCompleteAuthSession(); } catch {}

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'playverse://'],
  config: {
    screens: {
      AuthCallback: 'auth/callback',
      GameDetail: { path: 'GameDetail/:gameId?' },
      Tabs: {
        screens: {
          Home: 'home',
          Catalog: 'catalog',
          MyGames: 'my-games',
          Favorites: 'favorites',
          Profile: 'profile',
        },
      },
    },
  },
};

export default function MainApp() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexProvider client={convex}>
        <AuthProvider>
          <FavoritesProvider>
            <PushNotificationsManager />
            {/* 👉 En web desactivo linking para evitar loops en el preview */}
            <NavigationContainer linking={Platform.OS === 'web' ? undefined : linking}>
              <AppNavigator />
              <StatusBar style="light" />
            </NavigationContainer>
          </FavoritesProvider>
        </AuthProvider>
      </ConvexProvider>
    </GestureHandlerRootView>
  );
}


