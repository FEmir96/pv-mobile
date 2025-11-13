import { Platform } from 'react-native';
import Pushy from 'pushy-react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';

import { convexHttp } from './convexClient';

/** ====== Storage helpers (opcional con require) ====== */
const STORAGE_TOKEN_KEY = 'pv.pushyToken';
const STORAGE_DEVICE_ID_KEY = 'pv.deviceId';

function getSecureStore(): typeof import('expo-secure-store') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-secure-store');
  } catch {
    return null;
  }
}

async function getItem(key: string): Promise<string | null> {
  const SS = getSecureStore();
  if (!SS) return null;
  try {
    return await SS.getItemAsync(key);
  } catch {
    return null;
  }
}
async function setItem(key: string, value: string) {
  const SS = getSecureStore();
  if (!SS) return;
  try {
    await SS.setItemAsync(key, value);
  } catch {}
}
async function delItem(key: string) {
  const SS = getSecureStore();
  if (!SS) return;
  try {
    await SS.deleteItemAsync(key);
  } catch {}
}

/** ====== DeviceId estable ====== */
async function resolveDeviceId(): Promise<string> {
  // 1) Preferir un ID estable del SO
  if (Platform.OS === 'android') {
    try {
      const androidId =
        typeof (Application as any).getAndroidId === 'function'
          ? (Application as any).getAndroidId()
          : null;
      if (androidId) return `android:${androidId}`;
    } catch {
      // ignore and continue
    }
  }
  if (Platform.OS === 'ios') {
    try {
      const vendorId = await Application.getIosIdForVendorAsync();
      if (vendorId) return `ios:${vendorId}`;
    } catch {
      // iOS antiguo o permisos restringidos
    }
  }

  // 2) Reutilizar un ID nuestro persistido
  const stored = await getItem(STORAGE_DEVICE_ID_KEY);
  if (stored) return stored;

  // 3) Generar uno determinístico y persistirlo
  const entropy =
    `${Platform.OS}|${Device?.modelName ?? 'unknown'}|${Device?.deviceType ?? 'unk'}|` +
    `${Constants?.expoConfig?.slug ?? 'pv'}|${Date.now()}|${Math.random()}`;
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, entropy);
  const generated = `pv:${hash.slice(0, 32)}`; // corto y suficiente
  await setItem(STORAGE_DEVICE_ID_KEY, generated);
  return generated;
}

type PushyListenerOptions = {
  onReceive?: (data: Record<string, unknown>) => void;
  onClick?: (data: Record<string, unknown>) => void;
};

export function setupPushyListeners(opts: PushyListenerOptions = {}) {
  if (Platform.OS === 'web') return;
  try {
    if (typeof Pushy.listen === 'function') {
      Pushy.listen();
    }
    Pushy.setNotificationListener(async (data) => {
      const payload = (data && typeof data === 'object' ? data : {}) as Record<
        string,
        unknown
      >;
      opts.onReceive?.(payload);
    });
    Pushy.setNotificationClickListener(async (data) => {
      const payload = (data && typeof data === 'object' ? data : {}) as Record<
        string,
        unknown
      >;
      opts.onClick?.(payload);
    });
  } catch (error) {
    console.warn('[Pushy] listener setup failed', error);
  }
}

/** ====== Registro / desregistro en backend ====== */
export async function registerPushToken(opts: { profileId?: string; email?: string } = {}) {
  if (Platform.OS === 'web') return null;

  let deviceToken: string;
  try {
    // Pide permisos y registra en Pushy (retorna el token REAL de Pushy)
    deviceToken = await Pushy.register();
    // Notificación in-app en foreground (útil en dev)
    const toggle = (Pushy as unknown as { toggleInAppNotification?: (enabled: boolean) => void })
      .toggleInAppNotification;
    if (typeof toggle === 'function') {
      toggle(true);
    }
    if (typeof Pushy.listen === 'function') {
      Pushy.listen();
    }
  } catch (error) {
    console.warn('[Pushy] register error', error);
    return null;
  }

  // Guardar localmente para desregistrar luego si hace falta
  const prev = await getItem(STORAGE_TOKEN_KEY);
  if (prev !== deviceToken) {
    await setItem(STORAGE_TOKEN_KEY, deviceToken);
  }

  // Resolver deviceId estable
  const deviceId = await resolveDeviceId();

  // Enviar a Convex (usa tu mutación existente)
  await (convexHttp as any).mutation('pushTokens:register', {
    token: deviceToken,
    platform: Platform.OS,
    profileId:
      opts.profileId && opts.profileId.startsWith('local:') ? undefined : opts.profileId,
    email: opts.email ?? undefined,
    deviceId, // <<<<<<<<<<<<<<<<<<<<<<<< AQUÍ va el ID real
  });

  // Para que puedas copiar/pegar fácil si querés testear en dashboard
  // (miralo en la consola de Metro)
  console.log('[Pushy] token =>', deviceToken);
  console.log('[Pushy] deviceId =>', deviceId);

  return deviceToken;
}

export async function unregisterStoredPushToken() {
  const token = await getItem(STORAGE_TOKEN_KEY);
  if (!token) return;
  try {
    await (convexHttp as any).mutation('pushTokens:unregister', { token });
  } catch (err) {
    console.warn('unregisterStoredPushToken error', err);
  }
  await delItem(STORAGE_TOKEN_KEY);
}
