import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Button from '../components/Button';
import { colors, spacing, typography, radius } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { useConvexQuery } from '../lib/useConvexQuery';
import { convexHttp } from '../lib/convexClient';
import { subscribe as subscribeNotificationsBus } from '../lib/notificationsBus';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NotificationDoc = {
  _id: string;
  title?: string;
  message?: string;
  type?: string;
  isRead?: boolean;
  createdAt?: number;
};

type BadgeStyle = { label: string; background: string; color: string };

const BADGE_STYLES: Record<string, BadgeStyle> = {
  rental: { label: 'Alquiler', background: '#103B49', color: colors.accent },
  purchase: { label: 'Compra', background: '#2D1D49', color: '#D8B4FE' },
  'plan-expired': { label: 'Plan vencido', background: '#471515', color: '#FFB4A9' },
  'plan-renewed': { label: 'Plan renovado', background: '#0F3A2F', color: '#6EF2B7' },
  discount: { label: 'Promo', background: '#2F1E19', color: colors.accentAlt },
  'new-game': { label: 'Nuevo juego', background: '#13263D', color: '#7BD4FF' },
  achievement: { label: 'Logro', background: '#1E2D4C', color: '#AFB7FF' },
  'game-update': { label: 'Actualización', background: '#1B2538', color: '#A4C9D3' },
  default: { label: 'Aviso', background: '#1B2F3B', color: colors.textPrimary },
};

function getBadge(type?: string): BadgeStyle {
  if (!type) return BADGE_STYLES.default;
  return BADGE_STYLES[type] ?? BADGE_STYLES.default;
}

function formatDate(epoch?: number) {
  if (!epoch) return '';
  try {
    return new Date(epoch).toLocaleString();
  } catch {
    return '';
  }
}

export default function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useAuth();

  const { data, loading, refetch } = useConvexQuery<NotificationDoc[]>(
    'notifications:getForUser',
    profile?._id ? { userId: profile._id, limit: 100 } : ({} as any),
    { enabled: !!profile }
  );

  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      if (!profile?._id) {
        return;
      }
      refetchRef.current?.();
    }, [profile?._id])
  );

  useEffect(() => {
    if (!profile?._id) return;
    const unsubscribe = subscribeNotificationsBus(() => {
      refetchRef.current?.();
    });
    return unsubscribe;
  }, [profile?._id]);

  const notifications = data ?? [];
  // Optimistic local read-tracking to avoid UI lag/breakage
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());
  const effective = useMemo(() => {
    return notifications.map((n) => ({
      ...n,
      isRead: !!(n.isRead || localReadIds.has(String(n._id))),
    }));
  }, [notifications, localReadIds]);
  const unread = useMemo(
    () => effective.filter((item) => item.isRead !== true).length,
    [effective]
  );
  const goProfile = () => navigation.navigate('Tabs', { screen: 'Profile' } as any);

  const markAll = async () => {
    if (!profile?._id || unread === 0) return;
    // Optimistic: mark all current as read
    const prev = new Set(localReadIds);
    try {
      setLocalReadIds(new Set(notifications.map((n) => String(n._id))));
      await (convexHttp as any).mutation('notifications:markAllAsRead', { userId: profile._id });
    } catch {
      setLocalReadIds(prev);
    } finally {
      refetch();
    }
  };

  const clearAll = async () => {
    if (!profile?._id || notifications.length === 0) return;
    await (convexHttp as any).mutation('notifications:clearAllForUser', { userId: profile._id });
    refetch();
  };

  const markAsRead = async (item: NotificationDoc) => {
    if (!profile?._id) return;
    if (item.isRead || localReadIds.has(String(item._id))) return;
    const prev = new Set(localReadIds);
    try {
      // Optimistic
      const next = new Set(localReadIds);
      next.add(String(item._id));
      setLocalReadIds(next);
      await (convexHttp as any).mutation('notifications:markAsRead', {
        userId: profile._id,
        notificationId: item._id,
      });
    } catch {
      setLocalReadIds(prev);
    } finally {
      refetch();
    }
  };

  const deleteNotification = async (item: NotificationDoc) => {
    if (!profile?._id) return;
    await (convexHttp as any).mutation('notifications:deleteById', {
      userId: profile._id,
      notificationId: item._id,
    });
    refetch();
  };

  const renderRightActions = (item: NotificationDoc) => (
    <RectButton style={styles.deleteAction} onPress={() => deleteNotification(item)}>
      <Ionicons name="trash" size={20} color="#fff" />
    </RectButton>
  );

  if (!profile) {
    return (
      <View style={[styles.emptyRoot, { flex: 1 }]}>
        <Text style={styles.title}>Notificaciones</Text>

        <View>
          <Text style={[styles.subtitle, styles.centerText]}>
            Inicia sesión para ver tus notificaciones.
          </Text>
        </View>
      </View>
    );
  }



  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topMeta}>
          <Text style={styles.title}>Notificaciones</Text>
          <Text style={styles.subtitle}>
            {unread > 0 ? `Tienes ${unread} sin leer` : 'Estás al día'}
          </Text>
        </View>
      </View>
      <View style={styles.actionsRow}>
        <Button
          title="Marcar todo"
          variant="ghost"
          onPress={markAll}
          disabled={unread === 0}
        />
        <Button
          title="Limpiar bandeja"
          variant="ghost"
          onPress={clearAll}
          disabled={notifications.length === 0}
        />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            tintColor={colors.accent}
            colors={[colors.accent]}
            refreshing={loading}
            onRefresh={refetch}
          />
        }
      >
        {loading && notifications.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingLabel}>Cargando tus novedades...</Text>
          </View>
        ) : null}

        {!loading && notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off" size={46} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Todo en calma</Text>
            <Text style={styles.emptySubtitle}>
              Te avisaremos cuando PlayVerse tenga novedades para ti.
            </Text>
          </View>
        ) : null}

        {effective.map((item) => {
          const badge = getBadge(item.type);
          return (
            <Swipeable
              key={item._id}
              renderRightActions={() => renderRightActions(item)}
              overshootRight={false}
            >
              <Pressable
                onPress={() => markAsRead(item)}
                style={[
                  styles.card,
                  item.isRead ? styles.cardRead : styles.cardUnread,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.badge, { backgroundColor: badge.background }]}>
                    <Text style={[styles.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                  {!item.isRead ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.cardTitle}>{item.title ?? 'Notificación PlayVerse'}</Text>
                {item.message ? (
                  <Text style={styles.cardBody}>{item.message}</Text>
                ) : null}
                <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
              </Pressable>
            </Swipeable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  topBar: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  topMeta: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    color: colors.accent,
    fontSize: typography.h1,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  loadingState: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  loadingLabel: {
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.h2,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardUnread: {
    borderColor: colors.accent,
    shadowColor: colors.shadow,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  cardRead: {
    opacity: 0.75,
  },
  deleteAction: {
    width: 68,
    marginVertical: spacing.sm,
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C23A3A',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeLabel: {
    fontSize: typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  cardTitle: {
    fontSize: typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardBody: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  cardDate: {
    fontSize: typography.caption,
    color: '#9ABBCD',
  },
  emptyRoot: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    backgroundColor: colors.background,
  },
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  centerText: {
    textAlign: 'center',
  },
  centerSelf: {
    alignSelf: 'center',
  },
});
