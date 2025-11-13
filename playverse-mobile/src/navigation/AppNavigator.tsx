// playverse/playverse-mobile/src/navigation/AppNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import GameDetailScreen from '../screens/GameDetailScreen';
import CatalogScreen from '../screens/CatalogScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyGamesScreen from '../screens/MyGamesScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import AuthCallbackScreen from '../screens/AuthCallbackScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ContactScreen from '../screens/ContactScreen';
import PremiumScreen from '../screens/PremiumScreen';

import BottomTabBar from './BottomTabBar';
import HeaderBar from '../components/HeaderBar';

// ----------------- Tipos del Stack raíz -----------------
export type RootStackParamList = {
  Login: undefined;
  Tabs: undefined;
  GameDetail: { gameId: string; initial?: any };
  AuthCallback: undefined;
  Notifications: undefined;
  Premium: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Stacks anidados para TODOS los tabs (header unificado)
const HomeStack = createNativeStackNavigator();
const CatalogStack = createNativeStackNavigator();
const MyGamesStack = createNativeStackNavigator();
const FavoritesStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// Header unificado (igual al de Favoritos/Perfil)
function withPVHeader() {
  return {
    headerShown: true,
    title: '' as const,
    headerTitle: '' as const,
    header: ({ navigation, back }: any) => (
      <HeaderBar
        showBack={!!back}
        onBackPress={() => navigation.goBack()}
        showBell
        onBellPress={() => navigation.navigate('Notifications' as never)}
      />
    ),
  };
}

// ===== Stacks por tab (cada uno con HeaderBar unificado) =====
function HomeStackNavigator(): React.ReactElement {
  return (
    <HomeStack.Navigator screenOptions={withPVHeader()}>
      <HomeStack.Screen name="HomeRoot" component={HomeScreen} options={{ title: '' }} />
    </HomeStack.Navigator>
  );
}

function CatalogStackNavigator(): React.ReactElement {
  return (
    <CatalogStack.Navigator screenOptions={withPVHeader()}>
      <CatalogStack.Screen name="CatalogRoot" component={CatalogScreen} options={{ title: '' }} />
    </CatalogStack.Navigator>
  );
}

function MyGamesStackNavigator(): React.ReactElement {
  return (
    <MyGamesStack.Navigator screenOptions={withPVHeader()}>
      <MyGamesStack.Screen name="MyGamesRoot" component={MyGamesScreen} options={{ title: '' }} />
    </MyGamesStack.Navigator>
  );
}

function FavoritesStackNavigator(): React.ReactElement {
  return (
    <FavoritesStack.Navigator screenOptions={withPVHeader()}>
      <FavoritesStack.Screen name="FavoritesHome" component={FavoritesScreen} options={{ title: '' }} />
    </FavoritesStack.Navigator>
  );
}

function ProfileStackNavigator(): React.ReactElement {
  return (
    <ProfileStack.Navigator screenOptions={withPVHeader()}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: '' }} />
      <ProfileStack.Screen name="Contact" component={ContactScreen} options={{ title: '' }} />
    </ProfileStack.Navigator>
  );
}

// ----------------- Tabs -----------------
function Tabs(): React.ReactElement {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      // ✅ tabBar debe ser función
      tabBar={(props) => <BottomTabBar {...props} />}
      // ✅ el header lo ponen LOS STACKS internos
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
    >
      <Tab.Screen name="MyGames" component={MyGamesStackNavigator} options={{ headerShown: false }} />
      <Tab.Screen name="Catalog" component={CatalogStackNavigator} options={{ headerShown: false }} />
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{ headerShown: false }} />
      <Tab.Screen name="Favorites" component={FavoritesStackNavigator} options={{ headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

// ----------------- Stack raíz -----------------
export default function AppNavigator(): React.ReactElement {
  return (
    <RootStack.Navigator
      initialRouteName="Tabs"
      screenOptions={{
        headerShown: true,
        title: '',
        headerTitle: '',
        header: ({ navigation, back }) => (
          <HeaderBar
            showBack={!!back}
            onBackPress={() => navigation.goBack()}
            showBell
            onBellPress={() => navigation.navigate('Notifications' as never)}
          />
        ),
      }}
    >
      {/* Tabs NO muestra header: lo manejan sus Stacks internos */}
      <RootStack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <RootStack.Screen name="Login" component={LoginScreen} />
      <RootStack.Screen
        name="GameDetail"
        component={GameDetailScreen}
        options={{
          header: ({ navigation, back }) => (
            <HeaderBar
              showBack={!!back}
              onBackPress={() => navigation.goBack()}
              showBell={false}
            />
          ),
        }}
      />
      <RootStack.Screen name="AuthCallback" component={AuthCallbackScreen} />
      <RootStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          header: ({ navigation, back }) => (
            <HeaderBar
              showBack={!!back}
              onBackPress={() => navigation.goBack()}
              showBell={false}
            />
          ),
        }}
      />
      <RootStack.Screen name="Premium" component={PremiumScreen} />
    </RootStack.Navigator>
  );
}
