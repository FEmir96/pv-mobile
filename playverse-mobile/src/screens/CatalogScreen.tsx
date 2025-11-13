import React, { useMemo, useState, useLayoutEffect, useRef } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, GameCard, SearchBar } from '../components';
import { useConvexQuery } from '../lib/useConvexQuery';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Game } from '../types/game';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 10;
const MAX_PAGES_TO_SHOW = 3; // Límite de números de página a mostrar
const CATEGORIES = ['Todos', 'Acción', 'RPG', 'Carreras', 'Shooter', 'Sandbox', 'Estrategia', 'Deportes'];

const MIN_CARD_WIDTH = 150;
const GAP = spacing.md;
const PADDING_H = spacing.xl;

const ALL_GAMES_NAMES = [
  'queries/getGames:getGames',
  'queries/listGamesMinimal:listGamesMinimal',
] as const;

export default function CatalogScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { favoriteIds } = useFavorites();
  const { profile } = useAuth();
  const userId = profile?._id ?? null;

  useLayoutEffect(() => { nav.setOptions({ headerShown: true }); }, [nav]);

  const maxByWidth = Math.max(1, Math.min(3, Math.floor((width - PADDING_H * 2 + GAP) / (MIN_CARD_WIDTH + GAP))));
  const columns = width >= 1024 ? Math.min(3, maxByWidth) : Math.min(2, maxByWidth);

  const cardWidth = useMemo(() => {
    const available = width - PADDING_H * 2 - GAP * (columns - 1);
    return Math.floor(available / columns);
  }, [width, columns]);

  const { data: allGames, loading, refetch } = useConvexQuery<Game[]>(
    ALL_GAMES_NAMES as unknown as string[],
    {},
  );
  const { data: notifications } = useConvexQuery<any[]>(
    'notifications:getForUser',
    userId ? { userId, limit: 20 } : ({} as any),
    { enabled: !!userId, refreshMs: 40000 }
  );
  const unreadCount = useMemo(() => {
    if (!userId) return 0;
    return (notifications ?? []).filter((n: any) => n?.isRead === false).length;
  }, [userId, notifications]);

  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('Todos');
  const [page, setPage] = useState(1);
  const [plan, setPlan] = useState<'all' | 'free' | 'premium'>('all');
  const [showPlanFilter, setShowPlanFilter] = useState(false);
  const [tempPlan, setTempPlan] = useState<'all' | 'free' | 'premium'>(plan);

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

  const filtered = useMemo(() => {
    let list = (allGames ?? []).slice();
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((g) => g.title?.toLowerCase().includes(q));
    }
    if (cat !== 'Todos') {
      list = list.filter((g) => (g.genres || []).some((x) => x?.toLowerCase().includes(cat.toLowerCase())));
    }
    if (plan !== 'all') {
      const want = plan === 'premium' ? 'premium' : 'free';
      list = list.filter((g: any) => String((g as any)?.plan ?? '').toLowerCase() === want);
    }
    list.sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return list;
  }, [allGames, search, cat, plan]);

  const totalPages = Math.max(1, Math.ceil((filtered?.length ?? 0) / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const visible = filtered.slice(start, end);

  // Lógica para calcular qué números de página mostrar
  const pageNumbers = useMemo(() => {
    if (totalPages <= MAX_PAGES_TO_SHOW) {
      return Array.from({ length: totalPages }, (_, n) => n + 1);
    }

    const half = Math.floor(MAX_PAGES_TO_SHOW / 2);
    let startPage = Math.max(1, safePage - half + 1); // +1 para centrar mejor
    if (safePage <= half) {
      startPage = 1; // Si estamos al ppio, empezar en 1
    }
    let endPage = Math.min(totalPages, startPage + MAX_PAGES_TO_SHOW - 1);

    // Si `endPage` está al final, ajustar `startPage` para mostrar `MAX_PAGES_TO_SHOW`
    if (endPage === totalPages) {
      startPage = Math.max(1, totalPages - MAX_PAGES_TO_SHOW + 1);
    } else if (startPage > 1) {
      // Ajuste para que `safePage` tienda a estar más centrada
      startPage = Math.max(1, safePage - Math.floor(half / 2) - 1);
      endPage = Math.min(totalPages, startPage + MAX_PAGES_TO_SHOW - 1);
      if (endPage === totalPages) {
        startPage = Math.max(1, totalPages - MAX_PAGES_TO_SHOW + 1);
      }
    }
    // Caso especial si safePage es 2 y half es 2 (MAX=4)
    if (safePage === 2 && MAX_PAGES_TO_SHOW === 3) {
      startPage = 1;
      endPage = 4;
    }

    // Re-calculo final para asegurar que `start` sea 1 si `end` es menor que MAX
    if (endPage < totalPages && endPage < MAX_PAGES_TO_SHOW) {
      startPage = 1;
      endPage = Math.min(totalPages, MAX_PAGES_TO_SHOW);
    }
    // Re-calculo si safePage es 1
    if (safePage === 1) {
      startPage = 1;
      endPage = Math.min(totalPages, MAX_PAGES_TO_SHOW);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Si la lógica falló y no hay páginas, mostrar solo la actual
    if (pages.length === 0 && totalPages > 0) {
      pages.push(safePage);
    }

    // Si totalPages es 5 y MAX es 4, y estamos en pag 3, podria mostrar 2,3,4,5
    if (totalPages > MAX_PAGES_TO_SHOW && (safePage > 1 && safePage < totalPages)) {
      startPage = Math.max(1, safePage - 1); // [2, 3, 4]
      endPage = Math.min(totalPages, safePage + 1); // [2, 3, 4]

      if (safePage === totalPages - 1) { // pag 4 de 5
        startPage = Math.max(1, totalPages - MAX_PAGES_TO_SHOW + 1); // 5 - 4 + 1 = 2
        endPage = totalPages; // 5. -> [2, 3, 4, 5]
      } else if (safePage === 2) { // pag 2 de 5
        startPage = 1;
        endPage = Math.min(totalPages, MAX_PAGES_TO_SHOW); // 4 -> [1, 2, 3, 4]
      } else if (safePage > 2 && safePage < totalPages - 1) { // pag 3 de 6
        startPage = Math.max(1, safePage - 2); // 1
        endPage = Math.min(totalPages, safePage + 1); // 4 -> [1, 2, 3, 4] ???

        // Lógica más simple
        startPage = Math.max(1, safePage - 1); // Pag 3 -> 2
        endPage = Math.min(totalPages, safePage + (MAX_PAGES_TO_SHOW - 2)); // 3 + 2 = 5 -> [2, 3, 4, 5]
        if (endPage - startPage + 1 < MAX_PAGES_TO_SHOW) {
          startPage = Math.max(1, endPage - MAX_PAGES_TO_SHOW + 1);
        }
      }
    }

    // Lógica definitiva (re-simplificada)
    const finalPages = [];
    let finalStart = 1;
    let finalEnd = totalPages;

    if (totalPages > MAX_PAGES_TO_SHOW) {
      finalStart = Math.max(1, safePage - Math.floor((MAX_PAGES_TO_SHOW - 1) / 2));
      finalEnd = Math.min(totalPages, finalStart + MAX_PAGES_TO_SHOW - 1);

      if (finalEnd === totalPages) {
        finalStart = Math.max(1, totalPages - MAX_PAGES_TO_SHOW + 1);
      }
      if (finalStart === 1) {
        finalEnd = Math.min(totalPages, MAX_PAGES_TO_SHOW);
      }
    }

    for (let i = finalStart; i <= finalEnd; i++) {
      finalPages.push(i);
    }

    return finalPages;

  }, [safePage, totalPages]);


  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      refreshControl={<RefreshControl refreshing={!!loading} onRefresh={refetch} tintColor={colors.accent} />}
    >
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.xl, display: 'none' }]}>
        <View style={{ width: 36, height: 36 }} />
        <View style={styles.centerLogoWrap}>
          <Image source={require('../../assets/branding/pv-logo-h28.png')} style={styles.centerLogo} resizeMode="contain" />
        </View>
        <View style={styles.iconWrap}>
          <Pressable
            onPress={() => nav.navigate(profile ? 'Notifications' as any : 'Profile' as any)}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={profile ? 'Ir a notificaciones' : 'Ir a iniciar sesión'}
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

      <LinearGradient
        colors={['#0D2834', '#0F2D3A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.header}>
          <Text style={styles.title}>CATÁLOGO DE JUEGOS</Text>
          <Text style={styles.subtitle}>Sumergite en PlayVerse. Encontrá tu próxima obsesión entre nuestra vasta colección de títulos.</Text>
        </View>

        <View style={styles.filters}>
          <SearchBar
            value={search}
            onChangeText={(text) => { setSearch(text); setPage(1); }}
            onFilterPress={() => { setTempPlan(plan); setShowPlanFilter(true); }}
            hasActiveFilter={plan !== 'all'}
          />

          {showPlanFilter ? (
            <Modal
              visible={showPlanFilter}
              transparent
              animationType="fade"
              onRequestClose={() => setShowPlanFilter(false)}
            >
              <View style={styles.filterBackdrop}>
                <View style={styles.filterCard}>
                  <Text style={styles.filterTitle}>Filtrar por plan</Text>

                  <View style={styles.filterOptionsWrap}>
                    <Pressable
                      onPress={() => setTempPlan('all')}
                      style={({ pressed }) => [styles.filterOption, pressed && styles.filterOptionPressed]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: tempPlan === 'all' }}
                      hitSlop={8}
                    >
                      <View style={styles.filterOptionRow}>
                        <View style={[styles.filterDot, tempPlan === 'all' && styles.filterDotActive]} />
                        <Text style={[styles.filterOptionText, styles.filterOptionLabel, tempPlan === 'all' && styles.filterOptionTextActive]}>Todos</Text>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => setTempPlan('free')}
                      style={({ pressed }) => [styles.filterOption, pressed && styles.filterOptionPressed]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: tempPlan === 'free' }}
                      hitSlop={8}
                    >
                      <View style={styles.filterOptionRow}>
                        <View style={[styles.filterDot, tempPlan === 'free' && styles.filterDotActive]} />
                        <Text style={[styles.filterOptionText, styles.filterOptionLabel, tempPlan === 'free' && styles.filterOptionTextActive]}>Free</Text>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => setTempPlan('premium')}
                      style={({ pressed }) => [styles.filterOption, pressed && styles.filterOptionPressed]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: tempPlan === 'premium' }}
                      hitSlop={8}
                    >
                      <View style={styles.filterOptionRow}>
                        <View style={[styles.filterDot, tempPlan === 'premium' && styles.filterDotActive]} />
                        <Text style={[styles.filterOptionText, styles.filterOptionLabel, tempPlan === 'premium' && styles.filterOptionTextActive]}>Premium</Text>
                      </View>
                    </Pressable>
                  </View>

                  <View style={styles.filterActionsRow}>
                    <Pressable
                      onPress={() => { setPlan(tempPlan); setPage(1); setShowPlanFilter(false); }}
                      style={({ pressed }) => [styles.filterBtn, styles.filterBtnPrimary, pressed && { opacity: 0.9 }]}
                      accessibilityRole="button"
                      accessibilityLabel="Aplicar filtros"
                    >
                      <Text style={[styles.filterBtnText, styles.filterBtnPrimaryText]}>Aplicar</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          ) : null}

          <View style={styles.categoriesRow}>
            <View style={styles.catArrowBox}>
              {catShowLeft ? (
                <Pressable
                  onPress={() => {
                    const next = Math.max(0, catX - 200);
                    setCatX(next);
                    catScrollRef.current?.scrollTo({ x: next, animated: true });
                  }}
                  style={styles.catArrowBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Desplazar categorías a la izquierda"
                >
                  <Ionicons name="chevron-back" size={22} color={'#94A3B8'} />
                </Pressable>
              ) : (
                <Pressable
                  disabled
                  style={[styles.catArrowBtn, { opacity: 0.35 }]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: true }}
                  accessibilityLabel="Desplazar categorA-as a la izquierda"
                >
                  <Ionicons name="chevron-back" size={22} color={'#94A3B8'} />
                </Pressable>
              )}
            </View>

            <ScrollView
              ref={catScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={styles.categoriesContent}
              onLayout={(e) => setCatViewW(Math.round(e.nativeEvent.layout.width))}
              onScroll={({ nativeEvent }) => {
                const x = nativeEvent.contentOffset.x;
                const cw = nativeEvent.contentSize.width;
                const vw = nativeEvent.layoutMeasurement.width;
                setCatX(x);
                updateCatArrows(x, cw, vw);
              }}
              onContentSizeChange={(cw) => updateCatArrows(catX, cw, catViewW)}
              scrollEventThrottle={16}
            >
              {CATEGORIES.map((category) => (
                <View key={category} style={{ marginRight: spacing.md }}>
                  <Chip label={category} selected={category === cat} onPress={() => { setCat(category); setPage(1); }} />
                </View>
              ))}
            </ScrollView>

            <View style={styles.catArrowBox}>
              {catShowRight ? (
                <Pressable
                  onPress={() => {
                    const next = catX + 200;
                    setCatX(next);
                    catScrollRef.current?.scrollTo({ x: next, animated: true });
                  }}
                  style={styles.catArrowBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Desplazar categorías a la derecha"
                >
                  <Ionicons name="chevron-forward" size={22} color={'#94A3B8'} />
                </Pressable>
              ) : (
                <Pressable
                  disabled
                  style={[styles.catArrowBtn, { opacity: 0.35 }]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: true }}
                  accessibilityLabel="Desplazar categorA-as a la derecha"
                >
                  <Ionicons name="chevron-forward" size={22} color={'#94A3B8'} />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>

      {loading && visible.length === 0 ? (
        <View style={styles.grid}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <View key={i} style={[
              styles.skeleton,
              { width: cardWidth, marginRight: i % columns !== columns - 1 ? GAP : 0, marginBottom: GAP },
            ]} />
          ))}
        </View>
      ) : visible.length === 0 ? (
        <View style={{ paddingHorizontal: PADDING_H, paddingTop: spacing.xl }}>
          <Text style={styles.subtitle}>No se encontraron juegos.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {visible.map((row: any, i: number) => {
            const gameId = row._id ?? row.id ?? row.gameId ?? i;
            const isFav = favoriteIds.has(String(gameId));
            const isPremium = String(row?.plan ?? '').toLowerCase() === 'premium';
            return (
              <View
                key={String(gameId)}
                style={{ width: cardWidth, marginRight: i % columns !== columns - 1 ? GAP : 0, marginBottom: GAP, position: 'relative' }}
              >
                <GameCard
                  game={{
                    id: String(gameId),
                    title: row.title ?? 'Juego',
                    cover_url: row.cover_url ?? row.coverUrl,
                    purchasePrice: row.purchasePrice,
                    weeklyPrice: row.weeklyPrice,
                    igdbRating: row.igdbRating,
                    plan: row.plan,
                    isFavorite: isFav,
                  }}
                  onPress={() => gameId && nav.navigate('GameDetail', { gameId: String(gameId), initial: row })}
                  showPrices
                  compactPrices
                />
              </View>
            );
          })}
        </View>
      )}

      {filtered.length > 0 && totalPages > 1 ? (
        <View style={styles.paginationContainer}>
          <View style={styles.paginationInfo}>
            <Text style={styles.paginationText}>Página {safePage} de {totalPages} • {filtered.length} juegos</Text>
          </View>

          <View style={styles.paginationButtons}>
            <View style={[styles.paginationButton, safePage === 1 && { opacity: 0.55 }]}>
              <Pressable
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                style={({ pressed }) => [styles.pagePressable, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name="chevron-back" size={20} color={colors.accent} />
              </Pressable>
            </View>

            {pageNumbers.map((pg) => (
              <View
                key={pg}
                style={[
                  styles.pageButton,
                  pg === safePage && { backgroundColor: colors.accent, borderColor: colors.accent },
                ]}
              >
                <Pressable
                  onPress={() => setPage(pg)}
                  accessibilityState={{ selected: pg === safePage }}
                  style={({ pressed }) => [styles.pagePressable, pressed && { opacity: 0.9 }]}
                >
                  <Text
                    style={[
                      styles.pageButtonText,
                      pg === safePage ? { color: '#0F2D3A' } : { color: colors.textSecondary },
                    ]}
                  >
                    {pg}
                  </Text>
                </Pressable>
              </View>
            ))}

            <View style={[styles.paginationButton, safePage === totalPages && { opacity: 0.55 }]}>
              <Pressable
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
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
    paddingTop: spacing.xl, paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#072633',
    borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
  },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: '#0F2D3A' },
  iconWrap: { position: 'relative' },
  badge: { position: 'absolute', right: -4, top: -4, backgroundColor: '#ff6b6b', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  centerLogoWrap: { flex: 1, alignItems: 'center' },
  centerLogo: { height: 28, width: 120 },

  hero: { paddingBottom: spacing.md },
  header: { paddingHorizontal: PADDING_H, paddingTop: spacing.xl, gap: spacing.xs, alignItems: 'center' },
  title: { color: colors.accent, fontSize: typography.h1, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: '#D6EEF7', opacity: 0.9, textAlign: 'center' },

  filters: { paddingHorizontal: PADDING_H, paddingTop: spacing.xl },
  categoriesRow: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', columnGap: spacing.md },
  categoriesContent: { alignItems: 'center', paddingRight: spacing.lg },
  catArrowBox: { width: 38, alignItems: 'center', justifyContent: 'center' },
  catArrowBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.65)', borderWidth: 1, borderColor: '#143547' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: PADDING_H, paddingTop: spacing.md, alignItems: 'flex-start' },
  skeleton: { height: 320, borderRadius: 12, backgroundColor: '#143547', opacity: 0.35 },

  premiumBadge: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },

  paginationContainer: { paddingHorizontal: PADDING_H, paddingVertical: spacing.xl },
  paginationInfo: { alignItems: 'center', marginBottom: spacing.md },
  paginationText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },

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
  pageButtonText: { fontSize: 16, fontWeight: '800' },

  // Filter modal
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
  filterBtnGhost: { borderColor: colors.surfaceBorder, backgroundColor: 'transparent', marginRight: spacing.md },
  filterBtnGhostText: { color: colors.textSecondary, fontWeight: '800' },
  filterBtnPrimary: { borderColor: colors.accent, backgroundColor: colors.accent },
  filterBtnPrimaryText: { color: colors.accent, fontWeight: '900', borderWidth: 2, borderColor: '#F2B705', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  filterBtnText: { fontSize: 14 },
});
