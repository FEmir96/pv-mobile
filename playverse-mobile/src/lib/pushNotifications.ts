import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { convexHttp } from './convexClient';

const STORAGE_TOKEN_KEY = 'pv.expoPushToken';

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
  } catch {
    // ignore
  }
}

async function delItem(key: string) {
  const SS = getSecureStore();
  if (!SS) return;
  try {
    await SS.deleteItemAsync(key);
  } catch {
    // ignore
  }
}

async function requestToken() {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    (Constants as any)?.expoConfig?.extra?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId ||
    (Constants as any)?.manifest?.extra?.eas?.projectId;

  const token = (
    await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )
  ).data;
  return token;
}

export type ListenerOptions = {
  onReceive?: (data: Record<string, unknown>) => void;
  onClick?: (data: Record<string, unknown>) => void;
};

export function setupNotificationListeners(opts: ListenerOptions = {}) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowNotification: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const receiveSub = Notifications.addNotificationReceivedListener((notif) => {
    const data = (notif?.request?.content?.data || {}) as Record<string, unknown>;
    opts.onReceive?.(data);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((resp) => {
    const data = (resp?.notification?.request?.content?.data || {}) as Record<string, unknown>;
    opts.onClick?.(data);
  });

  return () => {
    receiveSub.remove();
    responseSub.remove();
  };
}

export async function registerPushToken(opts: { profileId?: string; email?: string } = {}) {
  if (Platform.OS === 'web') return null;

  const token = await requestToken();
  if (!token) return null;

  const prev = await getItem(STORAGE_TOKEN_KEY);
  if (prev !== token) {
    await setItem(STORAGE_TOKEN_KEY, token);
  }

  await (convexHttp as any).mutation('pushTokens:register', {
    token,
    platform: Platform.OS,
    profileId: opts.profileId,
    email: opts.email,
  });

  return token;
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
