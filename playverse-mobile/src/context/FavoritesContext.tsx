// playverse/playverse-mobile/src/context/FavoritesContext.tsx
import React, {
  createContext, useContext, useEffect, useMemo, useState, useCallback,
} from 'react';

import { useAuth } from './AuthContext';
import { useConvexQuery } from '../lib/useConvexQuery';
import { convexHttp } from '../lib/convexClient';

// Estructura del favorito
export type FavoriteRecord = {
  _id: string;
  userId: string;
  gameId: string;
  createdAt?: number;
  game?: {
    _id: string;
    title?: string;
    cover_url?: string | null;
    plan?: 'free' | 'premium' | string | undefined;
    weeklyPrice?: number | null;
    purchasePrice?: number | null;
    igdbRating?: number | null;
  } | null;
};

type FavoritesContextValue = {
  favorites: FavoriteRecord[];
  favoriteIds: Set<string>;
  loading: boolean;
  canFavorite: boolean;
  toggleFavorite: (
    gameId: string,
    game?: FavoriteRecord['game']
  ) => Promise<{ ok: boolean; status?: 'added' | 'removed'; error?: any }>;
  refetch: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

// 📌 Usa exactamente tu query pública existente
const FAVORITES_QUERY_NAME = 'queries/getFavoritesByUser:getFavoritesByUser' as const;

// Dedupe por gameId (conserva el más nuevo)
function uniqueByGameId(rows: any[]): FavoriteRecord[] {
  const map = new Map<string, FavoriteRecord>();
  for (const r of rows ?? []) {
    const gid = String(r?.gameId ?? r?.game?._id ?? '');
    if (!gid) continue;
    const prev = map.get(gid);
    const cand: FavoriteRecord = { ...(r as any), gameId: gid };
    const at = Number(cand?.createdAt ?? 0);
    const prevAt = Number(prev?.createdAt ?? 0);
    if (!prev || at >= prevAt) map.set(gid, cand);
  }
  return Array.from(map.values());
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const userId = profile?._id ? String(profile._id) : undefined;

  // ❌ Sin refreshMs, sin re-fetchs automáticos: NO más reloads molestos.
  const { data, loading, refetch } = useConvexQuery<any>(
    FAVORITES_QUERY_NAME,
    userId ? { userId } : ({} as any),
    { enabled: !!userId }
  );

  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);

  // Normalización una sola vez por cambio de respuesta
  useEffect(() => {
    if (!userId) { setFavorites([]); return; }
    const raw =
      Array.isArray(data) ? data :
      Array.isArray((data as any)?.items) ? (data as any).items :
      Array.isArray((data as any)?.results) ? (data as any).results :
      [];
    setFavorites(uniqueByGameId(raw));
  }, [userId, data]);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => String(f.gameId))),
    [favorites]
  );

  const toggleFavorite = useCallback<FavoritesContextValue['toggleFavorite']>(async (gameId, game) => {
    if (!userId) return { ok: false, error: new Error('No autenticado') };

    const key = String(gameId);
    const isFav = favoriteIds.has(key);
    const snapshot = favorites;

    // ✅ UI optimista (sin refetch inmediato para NO provocar reload)
    setFavorites((old) => {
      if (isFav) return uniqueByGameId(old.filter((f) => String(f.gameId) !== key));
      const optimistic: FavoriteRecord = {
        _id: `optimistic-${key}`,
        userId,
        gameId: key,
        createdAt: Date.now(),
        game: game
          ? {
              _id: String(game?._id ?? key),
              title: game?.title ?? 'Juego',
              cover_url: game?.cover_url ?? null,
              plan: game?.plan ?? undefined,
              weeklyPrice: game?.weeklyPrice ?? null,
              purchasePrice: game?.purchasePrice ?? null,
              igdbRating: game?.igdbRating ?? null,
            }
          : null,
      };
      return uniqueByGameId([optimistic, ...old]);
    });

    try {
      const result = await (convexHttp as any).mutation(
        'mutations/toggleFavorite:toggleFavorite',
        { userId, gameId: key }
      );
      if (result?.status === 'added') {
        try {
          await refetch();
        } catch (refetchErr) {
          console.warn('[Favorites] refetch falló tras agregar favorito:', refetchErr);
        }
      }
      // (opcional) verificar suave sin spamear:
      // setTimeout(() => { refetch(); }, 800);
      return { ok: true, status: (result?.status as 'added' | 'removed') ?? undefined };
    } catch (error) {
      // rollback si falla
      setFavorites(snapshot);
      return { ok: false, error };
    }
  }, [userId, favoriteIds, favorites, refetch]);

  const value = useMemo(() => ({
    favorites,
    favoriteIds,
    loading,
    canFavorite: !!userId,
    toggleFavorite,
    // refetch queda expuesto SOLO para pull-to-refresh manual si quisieras
    refetch: async () => { await refetch(); },
  }), [favorites, favoriteIds, loading, toggleFavorite, userId, refetch]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within <FavoritesProvider>');
  return ctx;
}
