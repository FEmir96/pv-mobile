// playverse/playverse-mobile/src/components/PushNotificationsManager.tsx
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { emitRefresh } from '../lib/notificationsBus';
import {
  registerPushToken,
  unregisterStoredPushToken,
  setupPushyListeners,
} from '../lib/pushNotifications';

export default function PushNotificationsManager(): React.ReactElement | null {
  const { profile } = useAuth();

  // Listeners de recepción / click
  useEffect(() => {
    if (Platform.OS === 'web') return;

    setupPushyListeners({
      onReceive: () => {
        // Forzá refresco de notificaciones/badges
        emitRefresh();
      },
      onClick: () => {
        // También refresco al tocar la noti
        emitRefresh();
      },
    });
  }, []);

  // Registro / desregistro del token al (des)loguear
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const pid = profile?._id ? String(profile._id) : undefined;
    const email = profile?.email || undefined;

    if (!pid) {
      // sin sesión: dado que Pushy no expira token solo, lo desasocio del backend
      unregisterStoredPushToken().catch(() => {});
      return;
    }

    registerPushToken({ profileId: pid, email }).catch((e) =>
      console.warn('registerPushToken failure', e)
    );
  }, [profile?._id, profile?.email]);

  return null;
}
