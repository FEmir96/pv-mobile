// playverse/playverse-mobile/src/components/HeaderBar.tsx
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../styles/theme';
import { PV_LOGO_H28 } from '../lib/asset';
import { useAuth } from '../context/AuthContext';
import { useConvexQuery } from '../lib/useConvexQuery';

type Props = {
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  showBell?: boolean;
  onBellPress?: () => void;
};

export default function HeaderBar({
  title = '',
  showBack = false,
  onBackPress,
  showBell = true,
  onBellPress,
}: Props) {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth() as any;
  const userId = profile?._id ?? null;
  const { data: notifications } = useConvexQuery<any[]>(
    'notifications:getForUser',
    userId ? { userId, limit: 100 } : ({} as any),
    { enabled: !!userId, refreshMs: 20000 }
  );
  const unreadCount = useMemo(() => {
    if (!userId) return 0;
    return (notifications ?? []).filter((n: any) => n?.isRead === false).length;
  }, [userId, notifications]);
  const goBack = () => {
    if (onBackPress) return onBackPress();
    // @ts-ignore
    if (nav.canGoBack?.()) nav.goBack();
    else {
      // @ts-ignore
      nav.navigate('Tabs', { screen: 'Home' });
    }
  };
  const openNotifications = () => {
    if (onBellPress) return onBellPress();
    // @ts-ignore
    nav.navigate('Notifications');
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(0, insets.top + spacing.sm - 5) }] }>
      <View style={styles.row}>
        {showBack ? (
          <Pressable onPress={goBack} style={styles.iconBtn} accessibilityRole="button">
            <Ionicons name="arrow-back" size={18} color={colors.accent} />
          </Pressable>
        ) : (
          <View style={styles.iconBtnPlaceholder} />
        )}

        <View style={styles.centerBlock}>
          {/* Logo centrado “grandecito” */}
          <Image source={PV_LOGO_H28} style={styles.logo} resizeMode="contain" />
          {/* Si algún screen quiere título, que lo pase. Por default lo ocultamos. */}
          {!!title && <Text style={styles.title}>{title}</Text>}
        </View>

        {showBell ? (
          <Pressable onPress={openNotifications} style={styles.iconBtn} accessibilityRole="button">
            <Ionicons name="notifications-outline" size={18} color={colors.accent} />
            {!!userId && unreadCount > 0 && (
              <View style={styles.notifBadge} pointerEvents="none">
                <Text style={styles.notifBadgeText}>{Math.min(unreadCount, 9)}</Text>
              </View>
            )}
          </Pressable>
        ) : (
          <View style={styles.iconBtnPlaceholder} />
        )}
      </View>

      <View style={styles.bottomLine} />
    </View>
  );
}

const BG = '#0D3441';
const LINE = '#114A59';

const styles = StyleSheet.create({
  container: {
    backgroundColor: BG,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  // ↑ Dejá el tamaño que te guste. Antes era 32x18; lo agrando para que luzca centrado.
  logo: { width: 120, height: 30, alignSelf: 'center' },
  title: {
    color: colors.accent,
    fontSize: typography.h2,
    fontWeight: '800',
    textTransform: 'capitalize',
    letterSpacing: 0.4,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E3A49',
    position: 'relative',
  },
  iconBtnPlaceholder: { width: 34, height: 34 },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  bottomLine: {
    height: 2,
    marginTop: spacing.sm,
    borderRadius: 2,
    backgroundColor: LINE,
    shadowColor: colors.accent,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
});
