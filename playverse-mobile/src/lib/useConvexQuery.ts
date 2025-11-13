// playverse/playverse-mobile/src/lib/useConvexQuery.ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { convexHttp, CONVEX_URL } from './convexClient';

type Options = { enabled?: boolean; refreshMs?: number };

const DISABLED_UNTIL = new Map<string, number>();
const IN_FLIGHT = new Map<string, Promise<any>>();

function keyFor(name: string, args: any) {
  return `${name}::${JSON.stringify(args ?? {})}`;
}

/**
 * nameOrNames: string o array de rutas Convex (intenta en orden).
 * Devuelve { data, loading, error, refetch }
 */
export function useConvexQuery<T>(
  nameOrNames: string | string[],
  args: any,
  opts?: Options
) {
  const names = useMemo(
    () => (Array.isArray(nameOrNames) ? nameOrNames : [nameOrNames]).filter(Boolean),
    [nameOrNames]
  );
  const enabled = opts?.enabled ?? true;

  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<any>(undefined);
  const [loading, setLoading] = useState<boolean>(!!enabled);

  const workingNameRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOnce = async (): Promise<void> => {
    if (!enabled || names.length === 0) return;

    setLoading(true);
    setError(undefined);

    const now = Date.now();
    const candidates = workingNameRef.current ? [workingNameRef.current] : names;

    let lastErr: any;
    for (const n of candidates) {
      const disabledUntil = DISABLED_UNTIL.get(n) ?? 0;
      if (disabledUntil > now) continue;

      const k = keyFor(n, args);
      try {
        const existing = IN_FLIGHT.get(k);
        const p: Promise<any> = existing ?? (convexHttp as any).query(n as any, args ?? {});
        if (!existing) IN_FLIGHT.set(k, p);

        const res = await p;
        IN_FLIGHT.delete(k);

        workingNameRef.current = n;
        setData(res as T);
        setLoading(false);
        return;
      } catch (e: any) {
        IN_FLIGHT.delete(k);
        lastErr = e;
        const msg = String(e?.message ?? '');
        if (/Could not find public function/i.test(msg)) {
          DISABLED_UNTIL.set(n, now + 60_000);
          console.warn(`[Convex][${CONVEX_URL}] No existe pública: ${n}`);
        } else {
          console.warn(`[Convex][${CONVEX_URL}] Error en ${n}:`, e);
        }
        // probar siguiente candidato
      }
    }

    setError(lastErr || new Error('All query candidates failed'));
    setLoading(false);
  };

  useEffect(() => {
    fetchOnce();

    if (enabled && opts?.refreshMs) {
      timerRef.current = setInterval(fetchOnce, opts.refreshMs);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, opts?.refreshMs, JSON.stringify(args), names.join('|')]);

  return { data: data as T | undefined, loading, error, refetch: fetchOnce };
}
