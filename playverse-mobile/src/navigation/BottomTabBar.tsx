// playverse-mobile/src/navigation/BottomTabBar.tsx
import React, { memo, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../styles/theme';

type TabKey = 'Home' | 'Catalog' | 'MyGames' | 'Favorites' | 'Profile';
type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<TabKey, { focused: IconName; unfocused: IconName; label: string }> = {
  Home:      { focused: 'home',   unfocused: 'home-outline',   label: 'Inicio' },
  Catalog:   { focused: 'grid',   unfocused: 'grid-outline',   label: 'Catálogo' },
  MyGames:   { focused: 'albums', unfocused: 'albums-outline', label: 'Mis juegos' },
  Favorites: { focused: 'heart',  unfocused: 'heart-outline',  label: 'Favoritos' },
  Profile:   { focused: 'person', unfocused: 'person-outline', label: 'Perfil' },
};

const BAR_H = 68;
const BUBBLE_SIZE = 44;
const BUBBLE_R = BUBBLE_SIZE / 2;
const HOME_BUBBLE_SIZE = 60;
const HOME_R = HOME_BUBBLE_SIZE / 2;

function TabItem({
  routeKey,
  name,
  label,
  focused,
  onPress,
}: {
  routeKey: string;
  name: TabKey;
  label: string;
  focused: boolean;
  onPress: () => void;
}) {
  // Animaciones
  const focusAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;   // 0→1 (no enfocado→enfocado)
  const pressAnim = useRef(new Animated.Value(0)).current;                 // 0→1 (reposo→presionado)

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: focused ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [focused, focusAnim]);

  const onPressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 0,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  // Escalas combinadas (presión + foco) sin ripple cuadrado
  const scaleOnPress = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });
  const bubbleScale  = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const bubbleOpacity = focusAnim; // fade junto al foco

  const baseIcon = ICONS[name];
  const isHome = name === 'Home';
  const iconFocused = name === 'MyGames' ? ('game-controller' as IconName) : baseIcon.focused;
  const iconUnfocused = name === 'MyGames' ? ('game-controller-outline' as IconName) : baseIcon.unfocused;
  const labelText = name === 'Catalog' ? 'Catálogo' : baseIcon.label;

  return (
    <Pressable
      key={routeKey}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      hitSlop={8}
    >
      <Animated.View style={[styles.itemInner, { transform: [{ scale: scaleOnPress }] }]}>
        <View style={[styles.iconWrap, isHome && styles.iconWrapHome]}>
          {isHome && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.homeBubble,
                focused ? styles.homeBubbleFocused : styles.homeBubbleInactive,
                { transform: [{ scale: bubbleScale }] },
              ]}
            />
          )}
          <Ionicons
            name={focused ? iconFocused : iconUnfocused}
            size={isHome ? 28 : focused ? 24 : 22}
            color={isHome && focused ? '#FFFFFF' : focused ? colors.accent : '#9AB7C3'}
          />
        </View>
        <Text style={[styles.label, focused && styles.labelFocused]} numberOfLines={1}>
          {labelText}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function _BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index];

  const handlePress = (name: TabKey, key: string) => {
    const evt = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (!evt.defaultPrevented) navigation.navigate(name as never);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 6) },
        Platform.OS === 'web' && (styles.webShadow as any),
      ]}
    >
      <View style={styles.row}>
        {state.routes.map((route, idx) => {
          const name = route.name as TabKey;
          const cfg = ICONS[name];
          if (!cfg) return null;
          return (
            <TabItem
              key={route.key}
              routeKey={route.key}
              name={name}
              label={cfg.label}
              focused={state.index === idx}
              onPress={() => handlePress(name, route.key)}
            />
          );
        })}
      </View>
    </View>
  );
}

export default memo(_BottomTabBar);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B2330',
    borderTopWidth: 1,
    borderTopColor: '#143547',
    minHeight: BAR_H,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  webShadow: {
    boxShadow: '0 -6px 22px rgba(0,0,0,0.18)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  itemPressed: { opacity: 0.96 },
  itemInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_R,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // asegura burbuja circular limpia
  },
  bubble: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: BUBBLE_R,
    backgroundColor: colors.accent, // 🔶 solo el interior
  },
  label: {
    marginTop: 4,
    color: '#9AB7C3',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    includeFontPadding: false,
  },
  labelFocused: { color: colors.accent },
  // estilos para el botón central (Home)
  iconWrapHome: {
    width: HOME_BUBBLE_SIZE,
    height: HOME_BUBBLE_SIZE,
    borderRadius: HOME_R,
  },
  homeBubble: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: HOME_R,
  },
  homeBubbleFocused: { backgroundColor: colors.accent },
  homeBubbleInactive: { backgroundColor: '#0B2330' },
});

