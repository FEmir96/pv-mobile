import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import * as Linking from 'expo-linking';

import { colors, spacing, typography } from '../styles/theme';
import { convexHttp } from '../lib/convexClient';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/AppNavigator';

export default function AuthCallbackScreen() {
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { setFromProfile } = useAuth();
  const [message, setMessage] = useState('Procesando autenticación...');
  const handledRef = useRef(false);

  useEffect(() => {
    const handleUrl = async (url?: string | null) => {
      if (handledRef.current) return;
      const current = url ?? (await Linking.getInitialURL()) ?? '';
      if (!current) {
        setMessage('No se recibió URL de autenticación.');
        return;
      }
      handledRef.current = true;

      try {
        const { queryParams } = Linking.parse(current);
        const email = String(queryParams?.email || '').toLowerCase();
        const name = String(queryParams?.name || '');
        const avatar = String(queryParams?.avatar || '');
        const provider = String(queryParams?.provider || 'web');

        if (!email) {
          // En flujos nativos con id_token no esperamos query params aquí.
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

        setFromProfile({
          _id: String(prof._id),
          name: prof.name || '',
          email: prof.email,
          role: prof.role,
          createdAt: prof.createdAt,
        });
        setMessage('¡Autenticado! Redirigiendo...');
        nav.navigate('Tabs');
      } catch {
        setMessage('Error durante la autenticación');
      }
    };

    // 1) initialURL si la app se abrió por el deep link
    handleUrl(null);

    // 2) eventos posteriores si la app ya estaba abierta
    const sub = Linking.addEventListener('url', (evt: { url: string }) => {
      handleUrl(evt?.url);
    });
    return () => {
      // RN/Expo proveen .remove en la subscripción
      // @ts-ignore: compat layer
      sub.remove?.();
    };
  }, [nav, setFromProfile]);

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
