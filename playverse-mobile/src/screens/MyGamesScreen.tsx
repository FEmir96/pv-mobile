// playverse/playverse-mobile/src/screens/MyGamesScreen.tsx
import React, { useMemo, useState, useCallback, useLayoutEffect, useRef } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Pressable,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { spacing, colors, typography } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, GameCard, Chip, SearchBar } from '../components';
import { useConvexQuery } from '../lib/useConvexQuery';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const MIN_CARD_WIDTH = 150;
const GAP = spacing.md;
const PADDING_H = spacing.xl;

type TabKey = 'rent' | 'buy';

type LibraryItem = {
  id: string;
  title: string;
  cover_url?: string | null;
  gameId: string;
  owned: boolean;
  expiresAt?: number | null;
  raw: any;
};

function fmtDate(ts?: number | string | null) {
  const n = Number(ts);
  if (!isFinite(n) || n <= 0) return null;
  const d = new Date(n);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

export default function MyGamesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const userId = profile?._id ?? null;

  const [tab, setTab] = useState<TabKey>('rent');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState<'recent' | 'oldest' | 'expires_soon' | 'expires_late'>('expires_soon');
  const [showSortModal, setShowSortModal] = useState(false);
  const [tempSort, setTempSort] = useState<'recent' | 'oldest' | 'expires_soon' | 'expires_late'>('expires_soon');

  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Categorías con scroll + flechas
  const catScrollRef = useRef<ScrollView>(null);
  const [catX, setCatX] = useState(0);
  const [catViewW, setCatViewW] = useState(0);
  const [catShowLeft, setCatShowLeft] = useState(false);
  const [catShowRight, setCatShowRight] = useState(false);
  const updateCatArrows = (x: number, contentW: number, viewW: number) => {
    setCatShowLeft(x > 6);
    setCatShowRight(x < Math.max(0, contentW - viewW - 6));
  };

  useLayoutEffect(() => {
    nav.setOptions({ headerShown: true });
  }, [nav]);

  const maxByWidth = Math.max(1, Math.min(3, Math.floor((width - PADDING_H * 2 + GAP) / (MIN_CARD_WIDTH + GAP))));
  const columns = width >= 1024 ? Math.min(3, maxByWidth) : Math.min(2, maxByWidth);

  const cardWidth = useMemo(() => {
    const available = width - PADDING_H * 2 - GAP * (columns - 1);
    return Math.floor(available / columns);
  }, [width, columns]);

  const { data: notifications } = useConvexQuery<any[]>(
    'notifications:getForUser',
    userId ? { userId, limit: 20 } : ({} as any),
    { enabled: !!userId }
  );
  const unreadCount = useMemo(() => {
    if (!userId) return 0;
    return (notifications ?? []).filter((n: any) => n?.isRead === false).length;
  }, [userId, notifications]);

  // ===== Convex, filtrado por usuario =====
  const enabled = !!profile?._id;

  const {
    data: purchasesRaw = [],
    loading: loadingPurchases,
    refetch: refetchPurchases,
  } = useConvexQuery<any[]>(
    'queries/getUserPurchases:getUserPurchases',
    enabled ? { userId: profile!._id } : ({} as any),
    { enabled }
  );

  const {
    data: rentalsRaw = [],
    loading: loadingRentals,
    refetch: refetchRentals,
  } = useConvexQuery<any[]>(
    'queries/getUserRentals:getUserRentals',
    enabled ? { userId: profile!._id } : ({} as any),
    { enabled }
  );

  const loading = loadingPurchases || loadingRentals;
  const onRefresh = useCallback(() => {
    refetchPurchases?.();
    refetchRentals?.();
  }, [refetchPurchases, refetchRentals]);

  const rentals: LibraryItem[] = useMemo(() => {
    return (rentalsRaw ?? [])
      .map((row: any, idx: number): LibraryItem => {
        const id = String(row?._id ?? row?.gameId ?? idx);
        return {
          id,
          title: row?.title ?? row?.game?.title ?? 'Juego',
          cover_url: row?.cover_url ?? row?.game?.cover_url ?? null,
          gameId: String(row?.gameId ?? row?._id ?? id),
          owned: false,
          expiresAt: row?.expiresAt ?? row?.rentedUntil ?? row?.rentalUntil ?? null,
          raw: row,
        };
      })
      .sort((a, b) => Number(a.expiresAt ?? 0) - Number(b.expiresAt ?? 0));
  }, [rentalsRaw]);

  const purchased: LibraryItem[] = useMemo(() => {
    return (purchasesRaw ?? [])
      .map((row: any, idx: number): LibraryItem => {
        const id = String(row?._id ?? row?.gameId ?? idx);
        return {
          id,
          title: row?.title ?? row?.game?.title ?? 'Juego',
          cover_url: row?.cover_url ?? row?.game?.cover_url ?? null,
          gameId: String(row?.gameId ?? row?._id ?? id),
          owned: true,
          expiresAt: null,
          raw: row,
        };
      })
      .sort((a, b) => (a.id > b.id ? -1 : 1));
  }, [purchasesRaw]);

  const visible: LibraryItem[] = tab === 'rent' ? rentals : purchased;

  // sort por defecto por tab
  React.useEffect(() => {
    if (tab === 'rent' && (sortType === 'recent' || sortType === 'oldest')) setSortType('expires_soon');
    if (tab === 'buy' && (sortType === 'expires_soon' || sortType === 'expires_late')) setSortType('recent');
  }, [tab]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('Todos');
    const source = visible.length > 0 ? visible : [...rentals, ...purchased];
    for (const it of source) {
      const g1 = Array.isArray((it as any)?.raw?.genres) ? (it as any).raw.genres : [];
      const g2 = Array.isArray((it as any)?.raw?.game?.genres) ? (it as any).raw.game.genres : [];
      const genres: string[] = [...g1, ...g2];
      for (const g of genres) {
        const name = String(g ?? '').trim();
        if (name) set.add(name);
      }
    }
    return Array.from(set);
  }, [visible, rentals, purchased]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = visible.filter((it) => {
      const matchesSearch = q ? String(it.title ?? '').toLowerCase().includes(q) : true;
      let matchesCat = true;
      if (selectedCategory && selectedCategory !== 'Todos') {
        const g1 = Array.isArray((it as any)?.raw?.genres) ? (it as any).raw.genres : [];
        const g2 = Array.isArray((it as any)?.raw?.game?.genres) ? (it as any).raw.game.genres : [];
        const genres: string[] = [...g1, ...g2];
        matchesCat = genres.some((g) => String(g ?? '').toLowerCase() === selectedCategory.toLowerCase());
      }
      return matchesSearch && matchesCat;
    });

    const out = [...base];
    if (tab === 'rent') {
      if (sortType === 'expires_late') {
        out.sort((a, b) => Number(b.expiresAt ?? 0) - Number(a.expiresAt ?? 0));
      } else {
        out.sort((a, b) => Number(a.expiresAt ?? 0) - Number(b.expiresAt ?? 0));
      }
    } else {
      const getCreated = (row: any) => Number(row?.raw?.createdAt ?? 0);
      if (sortType === 'oldest') out.sort((a, b) => getCreated(a) - getCreated(b));
      else out.sort((a, b) => getCreated(b) - getCreated(a));
    }
    return out;
  }, [visible, searchQuery, selectedCategory, sortType, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageItems = filtered.slice(start, end);

  if (!profile) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: spacing.xxl, flexGrow: 1 }}>
        <View style={[styles.headerBar, { paddingTop: insets.top + spacing.xl, display: 'none' }]}>
          <View style={{ width: 36, height: 36 }} />
          <View style={styles.centerLogoWrap}>
            <Image
              source={require('../../assets/branding/pv-logo-h28.png')}
              style={styles.centerLogo}
              resizeMode="contain"
            />
          </View>
          <Pressable
            onPress={() => nav.navigate('Tabs' as any, { screen: 'Profile' } as any)}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Ir a iniciar sesión"
          >
            <Ionicons name="notifications-outline" size={18} color={colors.accent} />
          </Pressable>
        </View>

        <LinearGradient
          colors={['#0D2834', '#0F2D3A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.hero, { flex: 1 }]}
        >
          <View style={styles.heroInner}>
            <Text style={styles.title}>MIS JUEGOS</Text>
            <Text style={styles.subtitle}>Tu arsenal personal de aventuras.</Text>
            <View style={styles.centerBlock}>
              <Text style={styles.subtitle}>
                Inicia sesión para ver tus juegos comprados o alquilados.
              </Text>
              <Button
                title="Iniciar sesión"
                variant="primary"
                onPress={() => nav.navigate('Tabs' as any, { screen: 'Profile' } as any)}
              />
            </View>
          </View>
        </LinearGradient>



      </ScrollView>
    );
  }


  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      refreshControl={<RefreshControl refreshing={!!loading} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.xl, display: 'none' }]}>
        <View style={{ width: 36, height: 36 }} />
        <View style={styles.centerLogoWrap}>
          <Image source={require('../../assets/branding/pv-logo-h28.png')} style={styles.centerLogo} resizeMode="contain" />
        </View>
        <View style={styles.iconWrap}>
          <Pressable
            onPress={() => nav.navigate('Notifications' as any)}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Ir a notificaciones"
          >
            <Ionicons name="notifications-outline" size={18} color={colors.accent} />
          </Pressable>
          {userId && unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{Math.min(unreadCount, 9)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <LinearGradient colors={['#0D2834', '#0F2D3A']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.hero}>
        <View style={styles.header}>
          <Text style={styles.title}>MIS JUEGOS</Text>
          <Text style={styles.subtitle}>Tu arsenal personal de aventuras.</Text>
          <View style={styles.actionButtons}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: tab === 'buy' ? colors.accent : 'transparent', borderColor: colors.accent }]}
              onPress={() => { setTab('buy'); setCurrentPage(1); }}
            >
              <Ionicons name="bookmark" size={18} color={tab === 'buy' ? '#0F2D3A' : colors.accent} />
              <Text style={[styles.actionButtonText, { color: tab === 'buy' ? '#0F2D3A' : colors.accent }]}>Mis compras</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: tab === 'rent' ? colors.accent : 'transparent', borderColor: colors.accent }]}
              onPress={() => { setTab('rent'); setCurrentPage(1); }}
            >
              <Ionicons name="time" size={18} color={tab === 'rent' ? '#0F2D3A' : colors.accent} />
              <Text style={[styles.actionButtonText, { color: tab === 'rent' ? '#0F2D3A' : colors.accent }]}>Mis alquileres</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={(t) => { setSearchQuery(t); setCurrentPage(1); }}
          placeholder="Buscar por titulo..."
          onFilterPress={() => { setTempSort(sortType); setShowSortModal(true); }}
          hasActiveFilter={tab === 'rent' ? (sortType !== 'expires_soon') : (sortType !== 'recent')}
        />
      </View>

      {/* Sort Modal */}
      {showSortModal ? (
        <Modal visible={showSortModal} transparent animationType="fade" onRequestClose={() => setShowSortModal(false)}>
          <View style={styles.filterBackdrop}>
            <View style={styles.filterCard}>
              <Text style={styles.filterTitle}>Ordenar por</Text>

              <View style={styles.filterOptionsWrap}>
                {tab === 'buy' ? (
                  <>
                    <Pressable
                      onPress={() => setTempSort('recent')}
                      style={({ pressed }) => [styles.filterOption, pressed && styles.filterOptionPressed]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: tempSort === 'recent' }}
                    >
                      <View style={styles.filterOptionRow}>
                        <View style={[styles.filterDot, tempSort === 'recent' && styles.filterDotActive]} />
                        <Text style={[styles.filterOptionText, styles.filterOptionLabel, tempSort === 'recent' && styles.filterOptionTextActive]}>Compras recientes</Text>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => setTempSort('oldest')}
                      style={({ pressed }) => [styles.filterOption, pressed && styles.filterOptionPressed]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: tempSort === 'oldest' }}
                    >
                      <View style={styles.filterOptionRow}>
                        <View style={[styles.filterDot, tempSort === 'oldest' && styles.filterDotActive]} />
                        <Text style={[styles.filterOptionText, styles.filterOptionLabel, tempSort === 'oldest' && styles.filterOptionTextActive]}>Compras antiguas</Text>
                      </View>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      onPress={() => setTempSort('expires_soon')}
                      style={({ pressed }) => [styles.filterOption, pressed && styles.filterOptionPressed]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: tempSort === 'expires_soon' }}
                    >
                      <View style={styles.filterOptionRow}>
                        <View style={[styles.filterDot, tempSort === 'expires_soon' && styles.filterDotActive]} />
                        <Text style={[styles.filterOptionText, styles.filterOptionLabel, tempSort === 'expires_soon' && styles.filterOptionTextActive]}>Más cercano a vencerse</Text>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => setTempSort('expires_late')}
                      style={({ pressed }) => [styles.filterOption, pressed && styles.filterOptionPressed]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: tempSort === 'expires_late' }}
                    >
                      <View style={styles.filterOptionRow}>
                        <View style={[styles.filterDot, tempSort === 'expires_late' && styles.filterDotActive]} />
                        <Text style={[styles.filterOptionText, styles.filterOptionLabel, tempSort === 'expires_late' && styles.filterOptionTextActive]}>Vencen más tarde</Text>
                      </View>
                    </Pressable>
                  </>
                )}
              </View>

              <View style={styles.filterActionsRow}>
                <Pressable
                  onPress={() => { setSortType(tempSort); setCurrentPage(1); setShowSortModal(false); }}
                  style={({ pressed }) => [styles.filterBtn, styles.filterBtnPrimary, pressed && { opacity: 0.9 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Aplicar orden"
                >
                  <Text style={[styles.filterBtnText, styles.filterBtnPrimaryText]}>Aplicar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {pageItems.length === 0 ? (
        <View style={{ paddingHorizontal: PADDING_H, paddingTop: spacing.xl, gap: spacing.sm }}>
          <Text style={styles.subtitle}>{tab === 'rent' ? 'No tenés juegos en alquiler.' : 'No tenés juegos comprados.'}</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {pageItems.map((item, i) => {
            const mr = columns > 1 && i % columns !== columns - 1 ? GAP : 0;

            const overlay = item.owned ? 'Comprado' : fmtDate(item.expiresAt) ? `Vence ${fmtDate(item.expiresAt)}` : undefined;

            return (
              <View key={item.id} style={{ width: cardWidth, marginRight: mr, marginBottom: GAP }}>
                <GameCard
                  game={{
                    id: item.id,
                    title: item.title,
                    cover_url: item.cover_url ?? undefined,
                    purchasePrice: undefined,
                    weeklyPrice: undefined,
                    plan: (item as any)?.raw?.plan ?? (item as any)?.raw?.game?.plan ?? undefined,
                  }}
                  showPrices={false}
                  showFavorite={false}
                  overlayLabel={overlay}
                  onPress={() => {
                    const gid = item?.gameId ?? item?.id;
                    gid && nav.navigate('GameDetail', { gameId: String(gid), initial: item.raw ?? item });
                  }}
                />
              </View>
            );
          })}
        </View>
      )}

      {totalPages > 1 ? (
        <View style={styles.paginationContainer}>
          <View style={styles.paginationInfo}>
            <Text style={styles.paginationText}>Página {safePage} de {totalPages} - {filtered.length} juegos</Text>
          </View>

          <View style={styles.paginationButtons}>
            <View style={[styles.paginationButton, safePage === 1 && { opacity: 0.55 }]}>
              <Pressable
                onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                style={({ pressed }) => [styles.pagePressable, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="chevron-back" size={20} color={colors.accent} />
              </Pressable>
            </View>

            {Array.from({ length: totalPages }, (_, n) => n + 1).map((pg) => {
              const selected = pg === safePage;
              return (
                <Pressable
                  key={pg}
                  onPress={() => setCurrentPage(pg)}
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [pressed && { opacity: 0.9 }]}
                  hitSlop={8}
                >
                  <View
                    style={[
                      styles.pageButton,
                      selected && { backgroundColor: colors.accent, borderColor: colors.accent },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pageButtonText,
                        selected ? { color: '#0F2D3A' } : { color: colors.textSecondary },
                      ]}
                    >
                      {pg}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            <View style={[styles.paginationButton, safePage === totalPages && { opacity: 0.55 }]}>
              <Pressable
                onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                style={({ pressed }) => [styles.pagePressable, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.accent} />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  headerBar: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#072633',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: '#0F2D3A',
  },
  iconWrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  centerLogoWrap: { flex: 1, alignItems: 'center' },
  centerLogo: { height: 28, width: 120 },

  hero: { paddingBottom: spacing.md },
  header: { paddingHorizontal: PADDING_H, paddingTop: spacing.xl, gap: spacing.sm },
  title: { color: colors.accent, fontSize: typography.h1, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#D6EEF7', opacity: 0.9, textAlign: 'center' },

  actionButtons: { flexDirection: 'row', paddingTop: spacing.md, gap: spacing.md },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionButtonText: { fontSize: 14, fontWeight: '800', marginLeft: 8 },

  searchSection: { paddingHorizontal: PADDING_H, paddingVertical: spacing.md },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING_H,
    paddingTop: spacing.md,
    alignItems: 'flex-start',
  },

  // categorías con flechas
  categoriesRow: { flexDirection: 'row', alignItems: 'center', columnGap: spacing.md },
  categoriesContent: { alignItems: 'center', paddingRight: spacing.lg },
  catArrowBox: { width: 38, alignItems: 'center', justifyContent: 'center' },
  catArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: '#143547',
  },

  // paginación
  paginationContainer: { paddingHorizontal: PADDING_H, paddingVertical: spacing.xl },
  paginationInfo: { alignItems: 'center', marginBottom: spacing.md },
  paginationText: { color: '#9AB7C3', fontSize: 14, fontWeight: '500' },

  paginationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  paginationButton: {
    width: 34,
    height: 34,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    backgroundColor: '#0B2330',
  },

  pageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.surfaceBorder, // gris visible
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    backgroundColor: 'transparent',
  },

  pagePressable: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },

  pageButtonText: { fontSize: 16, fontWeight: '800', includeFontPadding: false },

  // modal orden
  filterBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  filterCard: { width: '86%', backgroundColor: '#0B2430', borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: 14, padding: spacing.lg },
  filterTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 18, marginBottom: spacing.md, textAlign: 'center' },
  filterOptionsWrap: {},
  filterOption: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10 },
  filterOptionRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  filterOptionPressed: { backgroundColor: 'rgba(20, 53, 71, 0.35)' },
  filterDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.surfaceBorder, backgroundColor: 'transparent' },
  filterDotActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  filterOptionText: { color: colors.textSecondary, fontWeight: '700' },
  filterOptionLabel: { marginLeft: 12 },
  filterOptionTextActive: { color: colors.textPrimary },
  filterActionsRow: { marginTop: spacing.md, flexDirection: 'row', justifyContent: 'center' },
  filterBtn: { minWidth: 110, alignItems: 'center', paddingVertical: 10, paddingHorizontal: spacing.lg, borderRadius: 22, borderWidth: 1 },
  filterBtnPrimary: { borderColor: colors.accent, backgroundColor: colors.accent },
  filterBtnPrimaryText: { color: colors.accent, fontWeight: '900', borderWidth: 2, borderColor: '#F2B705', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  filterBtnText: { fontSize: 14 },
  heroInner: {
    flex: 1,
    paddingHorizontal: PADDING_H,
    paddingTop: spacing.xl,
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
