// Game type aligned with Convex `games` and `upcomingGames` tables.
// Fields are optional because not all records will include everything.
export type Game = {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  trailer_url?: string;
  plan?: 'free' | 'premium';
  createdAt?: number; // epoch ms
  genres?: string[];
  weeklyPrice?: number;     // alquiler por semana
  purchasePrice?: number;   // compra definitiva
  igdbRating?: number;
};

export type UpcomingGame = {
  id: string;
  title: string;
  genre?: string;
  releaseAt: number; // epoch ms
  priority?: number;
  cover_url?: string;
  gameId?: string;
};
