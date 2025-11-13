// playverse/playverse-mobile/src/lib/asset.ts
import type { ImageSourcePropType } from 'react-native';

// ✅ Logos empaquetados (no uses rutas /assets en runtime web)
export const PV_LOGO_H28: ImageSourcePropType = require('../../assets/branding/pv-logo-h28.png');
export const PV_LOGO_H32: ImageSourcePropType = require('../../assets/branding/pv-logo-h32.png');

/**
 * Normaliza URLs de imágenes que vienen de BD/APIs.
 * - data:...  -> se deja igual
 * - //host/... -> se fuerza a https
 * - http(s):// -> se deja igual
 * - cualquier otro valor no resoluble -> undefined (para mostrar fallback)
 */
export function resolveAssetUrl(input?: string | null): string | undefined {
  if (!input) return undefined;
  const raw = String(input).trim();
  if (!raw) return undefined;

  // data URI
  if (/^data:/i.test(raw)) return raw;

  // http(s)
  if (/^https?:\/\//i.test(raw)) {
    return normalizeDicebear(raw);
  }

  // protocolo omitido (//images.igdb.com/...)
  if (/^\/\//.test(raw)) return normalizeDicebear(`https:${raw}`);

  // host solo (images.igdb.com/igdb/image/upload/...)
  if (/^images\.igdb\.com/i.test(raw)) return normalizeDicebear(`https://${raw}`);

  // No resoluble (paths relativos, etc.)
  return undefined;
}

// ✅ Default export por si alguna parte del código hacía `import asset from '../lib/asset'`
const Asset = {
  PV_LOGO_H28,
  PV_LOGO_H32,
  resolveAssetUrl,
};
export default Asset;

function normalizeDicebear(url: string): string {
  if (!/^https?:\/\/api\.dicebear\.com/i.test(url)) return url;
  let next = url.replace(/\/svg(?=[/?]|$)/i, "/png");
  if (/([?&])format=/i.test(next)) {
    next = next.replace(/format=[^&]+/i, "format=png");
  } else {
    next += (next.includes("?") ? "&" : "?") + "format=png";
  }
  return next;
}
