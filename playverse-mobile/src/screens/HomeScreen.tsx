// playverse/playverse-mobile/src/screens/HomeScreen.tsx
import React, { useMemo, useLayoutEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { spacing, colors, typography } from '../styles/theme';
import { Button, GameCard, PremiumBanner, HeroBanner } from '../components';
import { useConvexQuery } from '../lib/useConvexQuery';
import type { Game, UpcomingGame } from '../types/game';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';

// const heroLogo = require('../../assets/images/playverse-logo.png');

const MIN_CARD_WIDTH = 150;
const GAP = spacing.md;
const PADDING_H = spacing.xl;

export default function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width: winW } = useWindowDimensions();
  const [gridW, setGridW] = useState(0);
  useLayoutEffect(() => {
    nav.setOptions({ headerShown: true });
  }, [nav]);

  const auth: any = (useAuth?.() as any) ?? {};
  const roleOrPlan = String(
    auth?.user?.role ?? auth?.role ?? auth?.plan ?? auth?.user?.plan ?? auth?.profile?.plan ?? ''
  ).toLowerCase();
  const isPremium =
    roleOrPlan === 'admin' ||
    roleOrPlan === 'premium' ||
    Boolean(auth?.isPremium ?? auth?.user?.isPremium ?? auth?.profile?.isPremium);

  // ===== Notificaciones (badge) =====
  const userId = auth?.user?._id ?? auth?.profile?._id ?? null;
  const { data: notifications } = useConvexQuery<any[]>(
    'notifications:getForUser',
    userId ? { userId, limit: 20 } : ({} as any),
    { enabled: !!userId }
  );
  const unreadCount = useMemo(() => {
    if (!userId) return 0;
    return (notifications ?? []).filter((n: any) => n?.isRead === false).length;
  }, [userId, notifications]);

  // Layout grid
  const usableW = useMemo(() => {
    const measured = gridW > 0 ? gridW : winW;
    return Math.max(0, measured - PADDING_H * 2);
  }, [gridW, winW]);

  const computedCols = useMemo(() => {
    const maxByWidth = Math.max(1, Math.floor((usableW + GAP) / (MIN_CARD_WIDTH + GAP)));
    return winW >= 1024 ? Math.min(3, maxByWidth) : Math.min(2, maxByWidth);
  }, [usableW, winW]);

  const cardWidth = useMemo(() => {
    const available = usableW - GAP * (computedCols - 1);
    return Math.floor(available / computedCols);
  }, [usableW, computedCols]);

  const onGridLayout = (e: LayoutChangeEvent) => {
    setGridW(e.nativeEvent.layout.width);
  };

  // --------- datos ----------
  const { data: allGames, loading: loadingAll, refetch: refetchAll } = useConvexQuery<Game[]>(
    // ['queries/getGames:getGames', 'queries/getAllGames:getAllGames'],
    'queries/getGames:getGames',
    {}
  );
  const { data: upcomingRaw, loading: loadingUpcoming, refetch: refetchUpcoming } =
    useConvexQuery<UpcomingGame[]>(
      [
        'queries/getUpcomingGames:getUpcomingGames',
        'queries/getUpcomingGames',
        'getUpcomingGames',
        'queries/getComingSoon:getComingSoon',
      ],
      { limit: 6 }
    );

  const newest = useMemo(() => {
    const list = (allGames ?? []).slice();
    list.sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return list.slice(0, 10);
  }, [allGames]);

  const upcoming = useMemo(() => {
    if (Array.isArray(upcomingRaw) && upcomingRaw.length) return upcomingRaw;
    const now = Date.now();
    const list = (allGames ?? []).filter((g: any) => {
      const d = Number(g?.releaseAt ?? g?.release_at ?? g?.firstReleaseDate ?? 0);
      return d > now;
    });
    list.sort(
      (a: any, b: any) =>
        Number(a?.releaseAt ?? a?.release_at ?? a?.firstReleaseDate ?? 0) -
        Number(b?.releaseAt ?? b?.release_at ?? b?.firstReleaseDate ?? 0)
    );
    return list.slice(0, 10);
  }, [upcomingRaw, allGames]);

  const topRated = useMemo(() => {
    const list = (allGames ?? []).slice();
    list.sort((a: any, b: any) => (Number(b?.igdbRating ?? 0) - Number(a?.igdbRating ?? 0)) || ((b.createdAt ?? 0) - (a.createdAt ?? 0)));
    return list.slice(0, 10);
  }, [allGames]);

  const popular = useMemo(() => {
    const list = (allGames ?? []).slice();
    list.sort((a: any, b: any) =>
      (Number(b?.popularity ?? b?.rentalsCount ?? 0) - Number(a?.popularity ?? a?.rentalsCount ?? 0)) ||
      (Number(b?.igdbRating ?? 0) - Number(a?.igdbRating ?? 0)) ||
      ((b.createdAt ?? 0) - (a.createdAt ?? 0))
    );
    return list.slice(0, 10);
  }, [allGames]);

  const discount = (p?: number | null) => {
    const n = Number(p);
    if (!Number.isFinite(n)) return p ?? undefined;
    return Number((n * 0.9).toFixed(2));
  };

  const mapGame = (row: any, idx: number) => {
    // ðŸ”’ Normalizo plan a la uniÃ³n 'free' | 'premium' para evitar el error de TS
    const planRaw = String(row?.plan ?? '').toLowerCase();
    const plan = (planRaw === 'premium' ? 'premium' : planRaw === 'free' ? 'free' : undefined) as
      | 'free'
      | 'premium'
      | undefined;

    return {
      id: String(row?._id ?? row?.id ?? row?.gameId ?? idx),
      title: row?.title ?? 'Juego',
      description: row?.description ?? row?.summary,
      cover_url: row?.cover_url ?? row?.coverUrl,
      gameId: row?._id ? String(row._id) : undefined,
      purchasePrice: isPremium ? discount(row?.purchasePrice) : row?.purchasePrice,
      weeklyPrice: isPremium ? discount(row?.weeklyPrice) : row?.weeklyPrice,
      igdbRating: row?.igdbRating,
      plan,
    };
  };

  const refreshing = !!(loadingAll || loadingUpcoming);
  const onRefresh = () => {
    refetchAll();
    refetchUpcoming();
  };

  const goToCatalog = () => nav.navigate('Tabs' as any, { screen: 'Catalog' } as any);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: spacing.xs,  }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      {/* Header provisto por el navigator (HeaderBar) */}

      {/* Hero banner */}
      <View>
        <HeroBanner />
      </View>

      {/* Nuevos juegos */}
      <View style={{ gap: spacing.xs, paddingHorizontal: PADDING_H, alignItems: 'flex-start', marginBottom: spacing.lg, marginTop: 0 }}>
        <Text style={{ color: colors.accent, fontSize: typography.h2, fontWeight: '900', letterSpacing: 0.3 }}>Nuevos juegos</Text>
        <Text style={{ color: colors.textPrimary, opacity: 0.9 }}>Explora la colección. ¡Encuentra tu próxima aventura!</Text>
      </View>
      {/* Carrusel Nuevos juegos (prototipo) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }} contentContainerStyle={{ paddingHorizontal: PADDING_H, columnGap: GAP }}>
        {newest.map((g: any, i: number) => {
          const game = mapGame(g, i);
          const tag = (Array.isArray(g?.genres) && g.genres.length ? g.genres[0] : (g?.genre ?? undefined));
          return (
            <View key={game.id} style={{ width: 210 }}>
              <GameCard game={game as any} onPress={() => (g?._id || g?.id || g?.gameId) && nav.navigate('GameDetail', { gameId: String(g?._id ?? g?.id ?? g?.gameId), initial: g })} />
            </View>
          );
        })}
      </ScrollView>

      {/* Populares */}
      <View style={{ gap: spacing.xs, paddingHorizontal: PADDING_H, paddingTop: spacing.xl, alignItems: 'flex-start', marginBottom: spacing.lg }}>
        <Text style={{ color: colors.accent, fontSize: typography.h2, fontWeight: '900', letterSpacing: 0.3 }}>Populares</Text>
        <Text style={{ color: colors.textPrimary, opacity: 0.9 }}>Los juegos mejor puntuados</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }} contentContainerStyle={{ paddingHorizontal: PADDING_H, columnGap: GAP }}>
        {popular.map((g: any, i: number) => {
          const game = mapGame(g, i);
          const tag = (Array.isArray(g?.genres) && g.genres.length ? g.genres[0] : (g?.genre ?? undefined));
          return (
            <View key={game.id} style={{ width: 210 }}>
              <GameCard game={game as any} onPress={() => (g?._id || g?.id || g?.gameId) && nav.navigate('GameDetail', { gameId: String(g?._id ?? g?.id ?? g?.gameId), initial: g })} />
            </View>
          );
        })}
      </ScrollView>
      
      <View style={{ alignItems: 'center', paddingHorizontal: PADDING_H, paddingTop: spacing.md, paddingBottom: spacing.xl }}>
        <Button title="Ver todo" variant="ghost" onPress={goToCatalog} style={{ alignSelf: 'center' }} />
      </View>
      {/* Próximamente */}
      <View style={{ gap: spacing.xs, paddingHorizontal: PADDING_H, paddingTop: spacing.xl, alignItems: 'flex-start', marginBottom: spacing.lg }}>
        <Text style={{ color: colors.accent, fontSize: typography.h2, fontWeight: '900', letterSpacing: 0.3 }}>Próximamente</Text>
        <Text style={{ color: colors.textPrimary, opacity: 0.9 }}>Agenda los lanzamientos que están por llegar</Text>
      </View>
      {/* Carrusel Proximamente (prototipo) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }} contentContainerStyle={{ paddingHorizontal: PADDING_H, columnGap: GAP }}>
        {(upcoming ?? []).map((item: any, i: number) => {
          const game = mapGame(item, i);
          const releaseAt = item?.releaseAt ?? item?.release_at ?? item?.launchDate ?? item?.firstReleaseDate;
          const releaseMs = typeof releaseAt === 'number' ? releaseAt : typeof releaseAt === 'string' ? Date.parse(releaseAt) : Number(releaseAt);
          const normalizedMs = typeof releaseMs === 'number' && Number.isFinite(releaseMs) ? (releaseMs < 1e12 ? releaseMs * 1000 : releaseMs) : null;
          const releaseDate = typeof normalizedMs === 'number' ? new Date(normalizedMs) : null;
          const releaseLabel =
            releaseDate && !Number.isNaN(releaseDate.getTime())
              ? `Próximamente en ${releaseDate.getFullYear()}`
              : 'Próximamente';
          const tag = (Array.isArray(item?.genres) && item.genres.length ? item.genres[0] : (item?.genre ?? undefined));
          return (
            <View key={game.id} style={{ width: 210 }}>
              <GameCard game={game as any} disabled overlayLabel={releaseLabel} showFavorite={false} />
            </View>
          );
        })}
      </ScrollView>
      {/* PremiumBanner ABAJO del botÃ³n */}
      <View style={{ paddingHorizontal: PADDING_H, paddingTop: spacing.xl }}>
        <PremiumBanner onPress={() => nav.navigate('Premium' as any)} />
      </View>
    </ScrollView>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: spacing.xs, paddingHorizontal: PADDING_H, paddingTop: spacing.xl }}>
      <Text style={{ color: colors.accent, fontSize: typography.h2, fontWeight: '900' }}>{title}</Text>
      {subtitle ? <Text style={{ color: colors.accent, opacity: 0.9 }}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  headerBar: {
    paddingTop: spacing.xl,
    paddingHorizontal: PADDING_H,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#072633',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  iconButton: {},

  header: { paddingHorizontal: PADDING_H, paddingTop: spacing.xl, gap: spacing.xs },
  title: { color: colors.accent, fontSize: typography.h1, fontWeight: '900' },
  subtitle: { color: colors.accent, opacity: 0.9 },

  grid: {
    // Ocultamos el grid tradicional para usar carruseles horizontales como en el prototipo
    display: 'none',
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING_H,
    paddingTop: spacing.md,
    alignItems: 'flex-start',
  },
  topBorder: {
    borderTopWidth: 1,
    borderTopColor: '#1c3b49',
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
  },
  center: { alignItems: 'center', paddingTop: spacing.md },

  watermark: {
    position: 'absolute',
    top: spacing.lg,
    opacity: 0.06,
    pointerEvents: 'none',
  },
});





