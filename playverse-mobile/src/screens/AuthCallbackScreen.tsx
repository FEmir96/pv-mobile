import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  useNavigation,
  type NavigationProp,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import * as Linking from 'expo-linking';

import { colors, spacing, typography } from '../styles/theme';
import { convexHttp } from '../lib/convexClient';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/AppNavigator';

type AuthCallbackRoute = RouteProp<RootStackParamList, 'AuthCallback'>;
type AuthCallbackParams = Record<string, string | undefined>;

export default function AuthCallbackScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<AuthCallbackRoute>();
  const { setFromProfile } = useAuth();
  const [message, setMessage] = useState('Procesando autenticacion...');
  const handledRef = useRef(false);

  const processQueryParams = useCallback(
    async (params: AuthCallbackParams) => {
      if (handledRef.current) return;
      handledRef.current = true;

      try {
        const email = String(params?.email || '').toLowerCase();
        const name = String(params?.name || '');
        const avatar = String(params?.avatar || '');
        const provider = String(params?.provider || 'web');

        if (!email) {
          // Para flows nativos solo avisamos y volvemos a la app principal.
          setMessage('Callback sin email (flujo nativo); redirigiendo...');
          nav.navigate('Tabs');
          return;
        }

        const upsert: any = await (convexHttp as any).mutation('auth:oauthUpsert', {
          email,
          name,
          avatarUrl: avatar,
          provider,
        });
        const id = upsert?._id;
        if (!id) {
          setMessage('No se pudo crear o actualizar el perfil.');
          return;
        }

        const prof: any = await (convexHttp as any).query('queries/getUserById:getUserById', { id });
        if (!prof) {
          setMessage('No se pudo recuperar el perfil.');
          return;
        }

        const status = (prof as any)?.status ?? 'Activo';
        if (status === 'Baneado') {
          setMessage('Tu cuenta fue baneada. Contacta a un administrador.');
          return;
        }

        setFromProfile({
          _id: String(prof._id),
          name: prof.name || '',
          email: prof.email,
          role: prof.role,
          createdAt: prof.createdAt,
          status,
        });
        setMessage('Autenticado, redirigiendo...');
        nav.navigate('Tabs');
      } catch (err: any) {
        setMessage(err?.message || 'Error durante la autenticacion');
      }
    },
    [nav, setFromProfile]
  );

  const handleUrl = useCallback(
    async (url?: string | null) => {
      if (handledRef.current) return;
      const current = url ?? (await Linking.getInitialURL()) ?? '';
      if (!current) {
        setMessage('No se recibio URL de autenticacion.');
        return;
      }

      const { queryParams } = Linking.parse(current);
      await processQueryParams((queryParams ?? {}) as AuthCallbackParams);
    },
    [processQueryParams]
  );

  useEffect(() => {
    let skippedInitialHandle = false;
    if (!handledRef.current && route?.params && Object.keys(route.params).length > 0) {
      skippedInitialHandle = true;
      processQueryParams(route.params);
    }

    if (!skippedInitialHandle) {
      handleUrl(null);
    }

    const sub = Linking.addEventListener('url', (evt: { url: string }) => {
      handleUrl(evt?.url);
    });
    return () => {
      // RN/Expo proveen .remove en la subscripcion
      // @ts-ignore: compat layer
      sub.remove?.();
    };
  }, [handleUrl, processQueryParams, route?.params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.msg}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  msg: {
    color: colors.accent,
    fontSize: typography.body,
  },
});
