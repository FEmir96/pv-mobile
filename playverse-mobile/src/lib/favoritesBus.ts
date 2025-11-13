export type FavoriteEvent =
  | { type: 'favorites/changed'; payload?: { gameId?: string; status?: 'added' | 'removed' } };

type Listener = (e: FavoriteEvent) => void;

const listeners = new Set<Listener>();

export const favoritesBus = {
  emitChange(gameId?: string, status?: 'added' | 'removed') {
    const evt: FavoriteEvent = { type: 'favorites/changed', payload: { gameId, status } };
    for (const cb of Array.from(listeners)) {
      try { cb(evt); } catch {}
    }
  },
  subscribe(cb: Listener) {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },
};
