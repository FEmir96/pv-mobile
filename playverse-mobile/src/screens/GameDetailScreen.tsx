// playverse/playverse-mobile/src/screens/GameDetailScreen.tsx
import React, { useEffect, useMemo, useState, useLayoutEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Modal,
  Animated,
  Share,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Linking from 'expo-linking';
import WebView from 'react-native-webview';
import type { WebViewHttpErrorEvent } from 'react-native-webview/lib/WebViewTypes';
import YoutubeIframe from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { RootStackParamList } from '../navigation/AppNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useConvexQuery } from '../lib/useConvexQuery';
import { colors, spacing, typography, radius } from '../styles/theme';
import { resolveAssetUrl } from '../lib/asset';
import { convexHttp } from '../lib/convexClient';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';

/** ===== Tipos para trailer ===== */
type TrailerInfo =
  | { kind: 'none' }
  | { kind: 'video'; url: string }
  | { kind: 'web'; url: string; headers?: Record<string, string> }
  | { kind: 'youtube'; videoId: string };

export default function GameDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GameDetail'>>();
  const params = (route.params ?? {}) as Partial<RootStackParamList['GameDetail']>;
  const linkingUrl = Linking.useURL();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: true });
  }, [navigation]);


  /** ===== Resolver gameId (deep links compatibles) ===== */
  const resolvedGameId = useMemo(() => {
    if (params.gameId) return params.gameId;
    if (!linkingUrl) return undefined;
    try {
      const parsed = new URL(linkingUrl);
      const queryId = parsed.searchParams.get('gameId');
      if (queryId) return queryId;
      const segments = parsed.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      if (last && last !== 'GameDetail') return decodeURIComponent(last);
    } catch { }
    return undefined;
  }, [linkingUrl, params.gameId]);

  const initial = params.initial;
  const gameId = resolvedGameId;

  const { width } = useWindowDimensions();
  const heroHeight = 300;
  const slideWidth = Math.max(260, width - spacing.xl * 2);

  /** ===== Fetch del juego ===== */
  const { data: remote, error, loading: loadingRemote } = useConvexQuery<any>(
    'queries/getGameById:getGameById',
    gameId ? { id: gameId } : ({} as any),
    { enabled: !!gameId, refreshMs: 30000 }
  );

  const game = remote ?? initial ?? null;

  const errorMessage = useMemo(() => {
    if (!error) return undefined;
    const raw = String(error?.message ?? '');
    if (/ArgumentValidationError/i.test(raw)) {
      return 'No pudimos encontrar este juego en el catálogo. Verifica el enlace.';
    }
    return 'No se pudo cargar la información más reciente.';
  }, [error]);

  /** ===== Screenshots de IGDB ===== */
  const [igdbShots, setIgdbShots] = useState<string[] | null>(null);
  const [loadingShots, setLoadingShots] = useState(false);

  useEffect(() => {
    if (!game?.title) return;
    let cancelled = false;
    async function loadShots(title: string) {
      try {
        setLoadingShots(true);
        const response = await (convexHttp as any).action(
          'actions/getIGDBScreenshots:getIGDBScreenshots',
          {
            title,
            limit: 8,
            size2x: true,
            minScore: 0.6,
            minScoreFallback: 0.45,
            includeVideo: false,
          } as any
        );
        if (!cancelled) {
          const urls = Array.isArray((response as any)?.urls) ? (response as any).urls : [];
          setIgdbShots(urls.filter(Boolean));
        }
      } catch {
        if (!cancelled) setIgdbShots([]);
      } finally {
        if (!cancelled) setLoadingShots(false);
      }
    }
    loadShots(game.title);
    return () => {
      cancelled = true;
    };
  }, [game?.title]);

  /** ===== Galería unificada (cover + extra + igdb) ===== */
  const gallery = useMemo(() => {
    if (!game && !initial) return [];
    const unique = new Set<string>();
    const push = (val?: string | null) => {
      if (val) unique.add(val);
    };
    const target = game ?? initial ?? {};
    push((target as any)?.cover_url);
    const extraCollections = [
      (target as any)?.extraImages,
      (target as any)?.extra_images,
      (target as any)?.screenshots,
      (target as any)?.gallery,
    ].filter(Array.isArray) as string[][];
    extraCollections.forEach(arr => arr.forEach(push));
    (igdbShots ?? []).forEach(push);
    return Array.from(unique)
      .slice(0, 10)
      .map(resolveAssetUrl)
      .filter(Boolean) as string[];
  }, [game, initial, igdbShots]);

  /** ===== Estado para héroe + miniaturas ===== */
  const [selectedIdx, setSelectedIdx] = useState(0);
  useEffect(() => {
    setSelectedIdx(0);
  }, [gallery.length]);
  const heroUri = gallery[selectedIdx];

  /** ===== Lightbox ===== */
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const openImage = (uri: string) => {
    setSelectedImage(uri);
    fadeAnim.stopAnimation();
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  };
  const closeImage = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setSelectedImage(null);
    });
  };

  /** ===== Trailer helpers + render ===== */
  function normalizeHttps(u: string) {
    if (/^https?:\/\//i.test(u)) return u;
    if (/^\/\//.test(u)) return `https:${u}`;
    return `https://${u}`;
  }
  function isLikelyYouTubeId(s: string) {
    return /^[a-zA-Z0-9_-]{6,}$/.test(s);
  }
  function extractYouTubeId(u: string) {
    if (!u) return undefined;
    const raw = u.startsWith('youtube:') ? u.slice('youtube:'.length) : u;
    if (!/^https?:\/\//i.test(raw) && isLikelyYouTubeId(raw)) return raw;
    const url = new URL(normalizeHttps(raw));
    const host = url.hostname.toLowerCase();
    const path = url.pathname || '';
    const seg = path.split('/').filter(Boolean);
    const qsV = url.searchParams.get('v');
    if (qsV) return qsV.replace(/[^a-zA-Z0-9_-]/g, '');
    if (host.includes('youtu.be')) {
      return (seg[0] || '').replace(/[^a-zA-Z0-9_-]/g, '');
    }
    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com') || host.startsWith('m.youtube.')) {
      const mapIdx: Record<string, number> = { embed: 1, shorts: 1, live: 1, v: 1 };
      if (seg.length >= 2 && mapIdx[seg[0]] === 1) {
        return seg[1].replace(/[^a-zA-Z0-9_-]/g, '');
      }
      const uParam = url.searchParams.get('u');
      if (uParam) {
        try {
          const inner = new URL('https://youtube.com' + uParam);
          const innerV = inner.searchParams.get('v');
          if (innerV) return innerV.replace(/[^a-zA-Z0-9_-]/g, '');
        } catch { }
      }
      const last = seg[seg.length - 1];
      if (last && isLikelyYouTubeId(last)) return last;
    }
    return undefined;
  }
  function extractVimeoId(u: string) {
    if (!u) return undefined;
    const raw = u.startsWith('vimeo:') ? u.slice('vimeo:'.length) : u;
    if (!/^https?:\/\//i.test(raw) && /^\d{6,}$/.test(raw)) return raw;
    const url = new URL(normalizeHttps(raw));
    const host = url.hostname.toLowerCase();
    const seg = url.pathname.split('/').filter(Boolean);
    if (host.includes('vimeo.com')) {
      const last = seg[seg.length - 1];
      if (/^\d{6,}$/.test(last || '')) return last!;
    }
    return undefined;
  }

  const trailerRaw =
    (game as any)?.trailer_url ||
    (game as any)?.extraTrailerUrl ||
    (initial as any)?.trailer_url ||
    (initial as any)?.extraTrailerUrl ||
    (game as any)?.trailerUrl ||
    (initial as any)?.trailerUrl;

  const rawTrailerInfo = useMemo<TrailerInfo>(() => {
    const raw = trailerRaw ? resolveAssetUrl(trailerRaw) || trailerRaw : undefined;
    if (!raw) return { kind: 'none' as const };
    try {
      const ytId = extractYouTubeId(raw);
      if (ytId) return { kind: 'youtube' as const, videoId: ytId };
      const vmId = extractVimeoId(raw);
      if (vmId) return { kind: 'web' as const, url: `https://player.vimeo.com/video/${vmId}` };
      const url = new URL(normalizeHttps(raw));
      if (/\.(mp4|webm|mov|m3u8)(\?|#|$)/i.test(url.pathname)) return { kind: 'video' as const, url: url.toString() };
      return { kind: 'web' as const, url: url.toString() };
    } catch {
      if (isLikelyYouTubeId(raw)) return { kind: 'youtube' as const, videoId: raw };
      return { kind: 'none' as const };
    }
  }, [trailerRaw]);

  const trailerInfo = rawTrailerInfo ?? { kind: 'none' as const };
  const trailerKey =
    trailerInfo.kind === 'youtube'
      ? trailerInfo.videoId
      : trailerInfo.kind === 'web' || trailerInfo.kind === 'video'
        ? trailerInfo.url
        : null;

  const [trailerError, setTrailerError] = useState(false);
  const [youtubeReady, setYoutubeReady] = useState(false);

  useEffect(() => {
    setTrailerError(false);
  }, [trailerInfo.kind, trailerKey]);
  useEffect(() => {
    if (trailerInfo.kind === 'youtube') setYoutubeReady(false);
  }, [trailerInfo.kind, trailerInfo.kind === 'youtube' ? trailerInfo.videoId : undefined]);

  const playerSource = useMemo(
    () => (trailerInfo.kind === 'video' && trailerInfo.url ? { uri: trailerInfo.url } : null),
    [trailerInfo]
  );
  const player = useVideoPlayer(playerSource, instance => {
    instance.pause();
    instance.staysActiveInBackground = false;
  });
  useEffect(() => {
    if (trailerInfo.kind !== 'video') player.pause();
  }, [player, trailerInfo]);

  const renderTrailerErrorCard = (openLink?: () => void) => (
    <View style={[styles.card, styles.glowCard, styles.trailerFallback]}>
      <Text style={styles.sectionLabel}>Trailer</Text>
      <Text style={styles.helper}>No pudimos cargar el trailer embebido. Podés verlo directamente en el navegador.</Text>
      {openLink ? (
        <Pressable style={styles.trailerButton} onPress={openLink}>
          <Ionicons name="open-outline" size={16} color={colors.accent} />
          <Text style={styles.trailerButtonText}>Abrir trailer</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const renderTrailerSection = () => {
    if (trailerInfo.kind === 'video' && playerSource) {
      return (
        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.md }}>
          <VideoView
            style={[styles.video, { width: slideWidth }]}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
            nativeControls
          />
        </View>
      );
    }

    if (trailerInfo.kind === 'youtube') {
      if (trailerError) {
        return (
          <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
            {renderTrailerErrorCard(() => Linking.openURL(`https://www.youtube.com/watch?v=${trailerInfo.videoId}`))}
          </View>
        );
      }
      return (
        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.md }}>
          <View style={[styles.embedContainer, { width: slideWidth }]}>
            {!youtubeReady ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : null}
            <YoutubeIframe
              videoId={trailerInfo.videoId}
              height={220}
              width={slideWidth}
              play={false}
              onReady={() => setYoutubeReady(true)}
              onError={(err: string) => {
                console.warn('[YouTubeIframe] error', err);
                setYoutubeReady(false);
                setTrailerError(true);
              }}
              webViewProps={{
                allowsFullscreenVideo: true,
                allowsInlineMediaPlayback: true,
                originWhitelist: ['*'],
                mediaPlaybackRequiresUserAction: false,
                javaScriptEnabled: true,
                domStorageEnabled: true,
                onHttpError: (event: WebViewHttpErrorEvent) => {
                  console.warn('[YouTubeIframe] http error', event.nativeEvent.statusCode);
                  setYoutubeReady(false);
                  setTrailerError(true);
                },
              }}
            />
          </View>
        </View>
      );
    }

    if (trailerInfo.kind === 'web') {
      if (trailerError) {
        return (
          <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
            {renderTrailerErrorCard(() => Linking.openURL(trailerInfo.url))}
          </View>
        );
      }
      return (
        <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
          <View style={[styles.embedContainer, { width: slideWidth }]}>
            <WebView
              source={trailerInfo.headers ? { uri: trailerInfo.url, headers: trailerInfo.headers } : { uri: trailerInfo.url }}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36"
              startInLoadingState
              renderLoading={() => (
                <View style={[styles.slideFallback, { flex: 1 }]}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              )}
              onError={() => setTrailerError(true)}
              onHttpError={(event: WebViewHttpErrorEvent) => {
                const { statusCode, description } = event.nativeEvent;
                console.warn('[WebView] trailer http error', statusCode, description);
                setTrailerError(true);
              }}
              style={{ flex: 1, backgroundColor: '#000' }}
            />
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.card, styles.glowCard]}>
        <Text style={styles.sectionLabel}>Trailer</Text>
        <Text style={styles.helper}>Este juego no tiene trailer disponible por ahora.</Text>
      </View>
    );
  };

  /** ===== Genres, release, rating ===== */
  const genresArray = useMemo<string[]>(() => {
    if (Array.isArray(game?.genres)) return game.genres.filter(Boolean);
    return [];
  }, [game?.genres]);
  const firstGenre = genresArray[0];

  const releaseDate = useMemo(() => {
    const epoch = (game as any)?.firstReleaseDate ?? (initial as any)?.firstReleaseDate;
    if (!epoch) return undefined;
    try {
      return new Date(epoch).toLocaleDateString();
    } catch {
      return undefined;
    }
  }, [game, initial]);

  const igdbScore = typeof (game as any)?.igdbRating === 'number' ? (game as any).igdbRating : undefined;

  /** ===== Precios / descuentos ===== */
  const { profile } = useAuth();
  const role = profile?.role ?? 'free';
  const hasDiscount = role === 'premium' || role === 'admin';
  const discountRate = hasDiscount ? 0.1 : 0;
  const discountPercent = hasDiscount ? Math.round(discountRate * 100) : 0;

  const basePurchasePrice =
    typeof (game as any)?.purchasePrice === 'number' ? Number((game as any).purchasePrice) : undefined;
  const baseWeeklyPrice =
    typeof (game as any)?.weeklyPrice === 'number' ? Number((game as any).weeklyPrice) : undefined;

  const finalPurchasePrice = useMemo(() => {
    if (typeof basePurchasePrice !== 'number') return undefined;
    const raw = discountRate > 0 ? basePurchasePrice * (1 - discountRate) : basePurchasePrice;
    return Math.round(raw * 100) / 100;
  }, [basePurchasePrice, discountRate]);

  const finalWeeklyPrice = useMemo(() => {
    if (typeof baseWeeklyPrice !== 'number') return undefined;
    const raw = discountRate > 0 ? baseWeeklyPrice * (1 - discountRate) : baseWeeklyPrice;
    return Math.round(raw * 100) / 100;
  }, [baseWeeklyPrice, discountRate]);

  const showPurchaseDiscount = hasDiscount && typeof basePurchasePrice === 'number';
  const showWeeklyDiscount = hasDiscount && typeof baseWeeklyPrice === 'number';

  /** ===== Favoritos (igual lógica que GameCard) ===== */
  const favCtx = useFavorites();
  const computedId = useMemo(
    () =>
      String(
        gameId ??
        (game as any)?._id ??
        (initial as any)?._id ??
        (game as any)?.id ??
        (initial as any)?.id ??
        ''
      ),
    [gameId, game, initial]
  );

  const ctxIsFav =
    !!(favCtx?.favoriteIds && computedId ? favCtx.favoriteIds.has?.(computedId) : false);
  const [localFav, setLocalFav] = useState<boolean>(ctxIsFav);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    setLocalFav(ctxIsFav);
  }, [ctxIsFav, computedId]);

  const isFavorite = !!localFav;

  const toggleFavorite = async () => {
    if (!computedId) return;
    if (!profile?._id) {
      setShowLoginModal(true);
      return;
    }
    try {
      const next = !isFavorite;
      setLocalFav(next); // optimista
      if (favCtx?.toggleFavorite) {
        await favCtx.toggleFavorite(computedId, {
          _id: computedId,
          title: (game as any)?.title ?? (initial as any)?.title ?? 'Juego',
          cover_url:
            (game as any)?.cover_url ??
            (initial as any)?.cover_url ??
            (gallery?.[0] ?? null),
          plan: (game as any)?.plan ?? (initial as any)?.plan ?? null,
          weeklyPrice: (game as any)?.weeklyPrice ?? (initial as any)?.weeklyPrice ?? null,
          purchasePrice: (game as any)?.purchasePrice ?? (initial as any)?.purchasePrice ?? null,
          igdbRating: (game as any)?.igdbRating ?? (initial as any)?.igdbRating ?? null,
        });
      }
    } catch {
      setLocalFav(prev => !prev);
    }
  };

  const SHARE_URL_BASE = 'https://playverse.com/juego';

  const onShare = async () => {
    try {
      const title = (game as any)?.title ?? 'Juego';
      const gid = (computedId ?? '').trim();
      const url = gid
        ? `${SHARE_URL_BASE}/${encodeURIComponent(gid)}`
        : 'https://playverse.com';

      // iOS: solo 'url'. Android: solo 'message'.
      const payload =
        Platform.OS === 'ios'
          ? { message: `${title} en PlayVerse\n`, url, title }
          : { message: `${title} en PlayVerse\n${url}`, title };

      const options =
        Platform.OS === 'ios'
          ? { subject: `${title} | PlayVerse` }
          : { dialogTitle: `Compartir ${title}` };

      await Share.share(payload as any, options as any);
    } catch {
      // noop
    }
  };



  /** ===== Notificaciones (badge) - no visible aquí ===== */
  const userId = profile?._id ?? null;
  const { data: notifications } = useConvexQuery<any[]>(
    'notifications:getForUser',
    userId ? { userId, limit: 20 } : ({} as any),
    { enabled: !!userId, refreshMs: 20000 }
  );
  const unreadCount = useMemo(() => {
    if (!userId) return 0;
    return (notifications ?? []).filter((n: any) => n?.isRead === false).length;
  }, [userId, notifications]);

  const isLoading = loadingRemote && !game;

  /** ===== UI ===== */
  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* ===== HERO ===== */}
        <View style={styles.heroContainer}>
          {heroUri ? (
            <Pressable style={{ flex: 1 }} onPress={() => openImage(heroUri)}>
              <Image source={{ uri: heroUri }} style={styles.heroImage} />
            </Pressable>
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Ionicons name="game-controller" size={60} color="#64748B" />
              <Text style={{ color: '#94A3B8', marginTop: 6, fontWeight: '700' }}>
                {(game as any)?.title || 'Juego'}
              </Text>
            </View>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={styles.heroGradient}
          />

          {/* Info superpuesta: título + rating + género */}
          <View style={styles.heroInfo}>
            <Text style={styles.gameTitle}>{(game as any)?.title || 'Juego'}</Text>

            <View style={styles.heroMetaRow}>
              {typeof igdbScore === 'number' ? (
                <View style={styles.heroRating}>
                  <Ionicons name="star" size={16} color={colors.accent} />
                  <Text style={styles.heroRatingText}>{igdbScore.toFixed(1)}</Text>
                </View>
              ) : null}

              {firstGenre ? (
                <View style={styles.genreBadge}>
                  <Text style={styles.genreTextCat}>{firstGenre}</Text>
                </View>
              ) : null}

              {(game as any)?.plan === 'premium' ? (
                <View style={[styles.genreBadge, { borderColor: '#F2B705' }]}>
                  <Text style={[styles.genreText, { color: '#F2B705' }]}>Premium</Text>
                </View>
              ) : (game as any)?.plan === 'free' ? (
                <View style={styles.genreBadge}>
                  <Text style={styles.genreText}>Free</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ===== Tira de miniaturas con flechas ===== */}
        <View style={styles.gallerySection}>
          <View style={styles.galleryContainer}>
            <Pressable
              onPress={() => setSelectedIdx((i) => Math.max(0, i - 1))}
              disabled={gallery.length < 2 || selectedIdx === 0}
              style={({ pressed }) => [styles.galleryArrow, (gallery.length < 2 || selectedIdx === 0) && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
              accessibilityLabel="Imagen anterior"
            >
              <Ionicons name="chevron-back" size={20} color="#9AA8B2" />
            </Pressable>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.galleryScroll}
              contentContainerStyle={styles.galleryContent}
              scrollEventThrottle={16}
            >
              {gallery.length ? (
                gallery.map((u, idx) => {
                  const selected = idx === selectedIdx;
                  return (
                    <Pressable
                      key={`${u}-${idx}`}
                      onPress={() => setSelectedIdx(idx)}
                      style={[styles.galleryItem, selected && styles.selectedGalleryItem]}
                    >
                      <Image source={{ uri: u }} style={[styles.galleryThumb, selected && styles.selectedGalleryImage]} />
                    </Pressable>
                  );
                })
              ) : (
                <View style={[styles.galleryEmpty]}>
                  <Text style={{ color: '#9AB7C3' }}>
                    {loadingShots ? 'Buscando imágenes...' : 'Sin imágenes'}
                  </Text>
                </View>
              )}
            </ScrollView>

            <Pressable
              onPress={() => setSelectedIdx((i) => Math.min(gallery.length - 1, i + 1))}
              disabled={gallery.length < 2 || selectedIdx === gallery.length - 1}
              style={({ pressed }) => [styles.galleryArrow, (gallery.length < 2 || selectedIdx === gallery.length - 1) && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
              accessibilityLabel="Imagen siguiente"
            >
              <Ionicons name="chevron-forward" size={20} color="#9AA8B2" />
            </Pressable>
          </View>
        </View>

        {/* ===== Trailer ===== */}
        {renderTrailerSection()}

        {/* ===== Bloque de precios ===== */}
        <View style={[styles.card, styles.glowCard, styles.pricingCard]}>
          <Text style={styles.premiumText}>
            {hasDiscount
              ? 'Tenés 10% de descuento por ser Premium'
              : '¡Disfrutá 10% de descuento si te suscribís a Premium!'}
          </Text>

          {typeof finalWeeklyPrice === 'number' ? (
            <View style={styles.priceRow}>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>Alquiler semanal</Text>
                <View style={styles.priceValues}>
                  {showWeeklyDiscount ? (
                    <>
                      <Text style={styles.priceOriginal}>${baseWeeklyPrice!.toFixed(2)}</Text>
                      <Text style={styles.priceFinal}>${finalWeeklyPrice!.toFixed(2)}</Text>
                      <Text style={styles.discountPill}>-{discountPercent}%</Text>
                    </>
                  ) : (
                    <Text style={styles.priceFinal}>${finalWeeklyPrice!.toFixed(2)}</Text>
                  )}
                </View>
              </View>
            </View>
          ) : null}

          {typeof finalPurchasePrice === 'number' ? (
            <View style={styles.priceRow}>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>Precio de compra</Text>
                <View style={styles.priceValues}>
                  {showPurchaseDiscount ? (
                    <>
                      <Text style={styles.priceOriginal}>${basePurchasePrice!.toFixed(2)}</Text>
                      <Text style={styles.priceFinal}>${finalPurchasePrice!.toFixed(2)}</Text>
                      <Text style={styles.discountPill}>-{discountPercent}%</Text>
                    </>
                  ) : (
                    <Text style={styles.priceFinal}>${finalPurchasePrice!.toFixed(2)}</Text>
                  )}
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable style={[styles.favoriteButton]} onPress={toggleFavorite} accessibilityRole="button" accessibilityLabel={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? colors.accent : colors.accent} />
              <Text style={styles.favoriteButtonText}>Favoritos</Text>
            </Pressable>
            <Pressable style={styles.shareButton} onPress={onShare} accessibilityRole="button" accessibilityLabel="Compartir juego">
              <Ionicons name="share-outline" size={20} color={colors.accent} />
            </Pressable>
          </View>

          <Text style={styles.webText}>
            ¡Gestioná desde la web para adquirir o jugar cualquier juego del catálogo!
          </Text>
        </View>

        {/* ===== Descripción ===== */}
        {(game as any)?.description ? (
          <View style={[styles.card, styles.glowCard]}>
            <Text style={styles.sectionLabelAmber}>Descripción</Text>
            <Text style={styles.body}>{(game as any).description}</Text>
          </View>
        ) : null}

        {/* ===== Ficha técnica ===== */}
        {(game as any)?.developers?.length ||
          (game as any)?.publishers?.length ||
          releaseDate ||
          (game as any)?.languages?.length ? (
          <View style={[styles.card, styles.glowCard]}>
            <Text style={styles.sectionLabelAmber}>Información del juego</Text>

            {(game as any)?.developers?.length ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Desarrollador</Text>
                <Text style={styles.infoValue}>{(game as any).developers.join(', ')}</Text>
              </View>
            ) : null}

            {(game as any)?.publishers?.length ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Editor</Text>
                <Text style={styles.infoValue}>{(game as any).publishers.join(', ')}</Text>
              </View>
            ) : null}

            {releaseDate ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Fecha de lanzamiento</Text>
                <Text style={styles.infoValue}>{releaseDate}</Text>
              </View>
            ) : null}

            {(game as any)?.languages?.length ? (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={styles.languagesLabel}>Idiomas</Text>
                <View style={styles.languagesContainer}>
                  {(game as any).languages.map((lang: string, i: number) => (
                    <View key={`${lang}-${i}`} style={styles.languagePill}>
                      <Text style={styles.languageText}>{lang}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {errorMessage ? (
          <View style={[styles.card, styles.glowCard]}>
            <Text style={styles.error}>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ===== Lightbox ===== */}
      <Modal visible={!!selectedImage} transparent onRequestClose={closeImage}>
        <Pressable style={styles.lightboxBackdrop} onPress={closeImage}>
          <Animated.View
            style={[
              styles.lightboxContent,
              {
                opacity: fadeAnim,
                transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
              },
            ]}
          >
            {selectedImage ? <Image source={{ uri: selectedImage }} style={styles.lightboxImage} /> : null}
          </Animated.View>
        </Pressable>
      </Modal>

      {/* ===== Modal de login (igual estilo que GameCard) ===== */}
      <Modal
        visible={showLoginModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLoginModal(false)}
      >
        <View style={mstyles.backdrop}>
          <View style={mstyles.modalCard}>
            <View style={mstyles.modalHeader}>
              <View style={mstyles.iconBadge}>
                <Ionicons name="lock-closed" size={22} color="#0F2D3A" />
              </View>
              <Text style={mstyles.modalTitle}>Inicia sesión</Text>
            </View>
            <Text style={mstyles.modalBody}>
              Para guardar tus juegos favoritos primero tenés que ingresar con tu cuenta PlayVerse.
            </Text>

            <View style={mstyles.buttonsRow}>
              <Pressable
                onPress={() => setShowLoginModal(false)}
                style={({ pressed }) => [mstyles.btnGhost, pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
              >
                <Text style={mstyles.btnGhostText}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowLoginModal(false);
                  navigation.navigate('Tabs' as any, { screen: 'Profile' } as any);
                }}
                style={({ pressed }) => [mstyles.btnPrimary, pressed && { transform: [{ scale: 0.98 }] }]}
                accessibilityRole="button"
                accessibilityLabel="Aceptar e ir a iniciar sesión"
              >
                <Text style={mstyles.btnPrimaryText}>Aceptar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

/** ===== Estilos ===== */
const styles = StyleSheet.create({
  /* HERO */
  heroContainer: {
    height: 300,
    position: 'relative',
    backgroundColor: '#0B1E28',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroInfo: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.md,
  },
  gameTitle: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,36,52,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#1F546B',
  },
  heroRatingText: {
    color: '#D6EEF7',
    marginLeft: 4,
    fontWeight: '800',
  },
  genreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'rgba(16,36,52,0.7)',
  },
  genreText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  genreTextCat: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* GALERÍA (miniaturas) */
  gallerySection: {
    paddingVertical: 16,
  },
  galleryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    columnGap: 8,
  },
  galleryArrow: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderWidth: 1,
    borderColor: '#143547',
  },
  galleryScroll: {
    flex: 1,
  },
  galleryContent: {
    paddingHorizontal: 8,
  },
  galleryItem: {
    marginHorizontal: 4,
    position: 'relative',
    borderRadius: 8,
  },
  galleryThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1b4050',
    backgroundColor: '#0F2D3A',
  },
  selectedGalleryItem: {
    borderWidth: 2,
    borderColor: '#d19310',
    borderRadius: 8,
  },
  selectedGalleryImage: {
    opacity: 0.88,
  },
  playOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryEmpty: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* VIDEO / EMBED */
  video: {
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#1b4050',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 10,
  },
  embedContainer: {
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#1b4050',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 10,
  },

  /* CARD base */
  card: {
    backgroundColor: 'rgba(16, 36, 52, 0.65)',
    borderColor: '#1C4252',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  glowCard: {
    borderColor: 'rgba(242, 183, 5, 0.55)',
    shadowColor: '#F2B705',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    backgroundColor: 'rgba(12, 28, 36, 0.88)',
  },

  /* PRICING */
  pricingCard: {
    gap: spacing.md,
  },
  premiumText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    color: '#D6EEF7',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#9AB7C3',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '800',
  },
  priceValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priceOriginal: {
    color: '#6E8491',
    textDecorationLine: 'line-through',
    fontSize: typography.body,
  },
  priceFinal: {
    color: '#FAD35D',
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(242,183,5,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  discountPill: {
    backgroundColor: 'rgba(33, 22, 4, 0.85)',
    color: '#FFCE59',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    fontSize: typography.caption,
    fontWeight: '800',
    letterSpacing: 0.8,
    borderWidth: 1,
    borderColor: 'rgba(242, 183, 5, 0.65)',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
    gap: 6,
  },
  favoriteButtonText: {
    color: colors.accent,
    fontWeight: '800',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#9AB7C3',
    marginTop: 6,
  },

  /* TÍTULOS / TEXTOS */
  sectionLabel: {
    color: '#D6EEF7',
    fontWeight: '800',
    marginBottom: spacing.sm,
    fontSize: typography.h3,
    textShadowColor: 'rgba(214,238,247,0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  sectionLabelAmber: {
    color: '#F2B705',
    fontWeight: '800',
    marginBottom: spacing.sm,
    fontSize: typography.h3,
    textShadowColor: 'rgba(242,183,5,0.25)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  body: {
    color: '#CDE4ED',
    lineHeight: 22,
    fontSize: typography.body,
  },
  helper: {
    color: '#98B8C6',
    fontSize: typography.body,
  },
  error: {
    color: '#ff7675',
    marginTop: spacing.xs,
  },

  /* INFO GRID */
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    color: '#9AB7C3',
    fontWeight: '700',
    flex: 1,
    paddingRight: 10,
  },
  infoValue: {
    color: '#D6EEF7',
    fontWeight: '800',
    flex: 1,
    textAlign: 'right',
  },
  languagesLabel: {
    color: '#9AB7C3',
    fontWeight: '700',
    marginBottom: 8,
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languagePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
  },
  languageText: {
    color: '#D6EEF7',
    fontWeight: '700',
    fontSize: 12,
  },

  /* LIGHTBOX */
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,11,16,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  lightboxContent: {
    width: '100%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#051720',
    borderWidth: 1,
    borderColor: '#13485c',
  },
  lightboxImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    resizeMode: 'cover',
  },

  /* LOADING overlay para YouTube */
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },

  slideFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  trailerFallback: {
    gap: spacing.sm,
  },

  trailerButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#103B49',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#1F546B',
  },

  trailerButtonText: {
    color: colors.accent,
    fontWeight: '700',
  },
});

/* ===== Modal styles (copiados de GameCard para consistencia) ===== */
const mstyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 21, 30, 0.78)',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0F2D3A',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#173A4C',
    paddingHorizontal: 24,
    paddingVertical: 26,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  modalTitle: {
    color: colors.accent,
    fontSize: typography.h3,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  modalBody: {
    color: '#D6EEF7',
    fontSize: typography.body,
    lineHeight: 20,
    marginBottom: 26,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  btnGhost: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#254F62',
    borderRadius: 14,
    backgroundColor: '#0B2330',
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnGhostText: {
    color: '#9ED3E6',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btnPrimary: {
    width: '48%',
    borderRadius: 14,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 14,
  },
  btnPrimaryText: {
    color: '#0F2D3A',
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
