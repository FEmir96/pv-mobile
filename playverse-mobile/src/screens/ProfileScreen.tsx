import React, { useCallback, useEffect, useMemo, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Pressable,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography, radius } from '../styles/theme';
import Button from '../components/Button';
import SocialButton from '../components/SocialButton';
import { useAuth } from '../context/AuthContext';
import { useConvexQuery } from '../lib/useConvexQuery';
import { resolveAssetUrl } from '../lib/asset';
import { convexHttp } from '../lib/convexClient';
import { signInWithGoogleNative, signInWithMicrosoftNative } from '../auth/nativeOAuth';
import type { RootStackParamList } from '../navigation/AppNavigator';

const ROLE_CHIP_STYLES: Record<
  string,
  { label: string; pill: { backgroundColor: string; borderColor: string }; text: string }
> = {
  free: {
    label: 'Free',
    pill: { backgroundColor: '#1B2F3B', borderColor: '#A4C9D3' },
    text: '#D9E7EF',
  },
  premium: {
    label: 'Premium',
    pill: { backgroundColor: '#F2B70522', borderColor: '#F2B705' },
    text: colors.accent,
  },
  admin: {
    label: 'Admin',
    pill: { backgroundColor: '#2D1D49', borderColor: '#A855F7' },
    text: '#D8B4FE',
  },
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type FieldErrors = { name?: string; email?: string; password?: string; confirmPassword?: string };

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { profile, loading, error, loginEmail, register, logout, setFromProfile } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [avatarModal, setAvatarModal] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'microsoft' | null>(null);

  // Header propio
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: true });
  }, [navigation]);

  const handleContactPress = useCallback(() => {
    navigation.navigate('Contact' as any);
  }, [navigation]);

  const confirmLogout = useCallback(() => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que querés cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
      ],
      { cancelable: true }
    );
  }, [logout]);

  const userId = profile?._id;

  const { data: fullProfile } = useConvexQuery<any>(
    'queries/getUserById:getUserById',
    userId ? { id: userId } : ({} as any),
    { enabled: !!userId, refreshMs: 45000 }
  );

  const { data: paymentMethods } = useConvexQuery<any[]>(
    'queries/getPaymentMethods:getPaymentMethods',
    { userId },
    { enabled: !!userId, refreshMs: 45000 }
  );

  const { data: purchases } = useConvexQuery<any[]>(
    'queries/getUserPurchases:getUserPurchases',
    userId ? { userId } : ({} as any),
    { enabled: !!userId, refreshMs: 45000 }
  );

  const { data: rentals } = useConvexQuery<any[]>(
    'queries/getUserRentals:getUserRentals',
    userId ? { userId } : ({} as any),
    { enabled: !!userId, refreshMs: 45000 }
  );

  const { data: notifications } = useConvexQuery<any[]>(
    'notifications:getForUser',
    userId ? { userId, limit: 20 } : ({} as any),
    { enabled: !!userId, refreshMs: 20000 }
  );

  const unreadCount = useMemo(() => {
    if (!userId) return 0;
    return (notifications ?? []).filter((n: any) => n?.isRead === false).length;
  }, [userId, notifications]);

  useEffect(() => {
    setFieldErrors({});
    setConfirmPassword('');
  }, [mode]);

  const validateForm = useCallback(() => {
    const errors: FieldErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedEmail) {
      errors.email = 'Ingresa tu email.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Ingresa un email válido.';
    }

    if (!trimmedPassword) {
      errors.password = 'Ingresa tu contraseña.';
    } else if (trimmedPassword.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (mode === 'register') {
      if (!trimmedName) {
        errors.name = 'Ingresa tu nombre.';
      } else if (trimmedName.length < 2) {
        errors.name = 'El nombre es demasiado corto.';
      }
      if (!trimmedConfirm) {
        errors.confirmPassword = 'Repetí tu contraseña.';
      } else if (trimmedConfirm !== trimmedPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden.';
      }
    }

    return {
      errors,
      values: {
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
      },
    };
  }, [email, password, confirmPassword, name, mode]);

  const handleSubmit = useCallback(async () => {
    if (loading) return;
    const { errors, values } = validateForm();
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setEmail(values.email);
    if (mode === 'register') setName(values.name);

    const ok =
      mode === 'login'
        ? await loginEmail(values.email, values.password)
        : await register(values.name, values.email, values.password);

    if (ok) { setPassword(''); setConfirmPassword(''); }
  }, [loading, mode, validateForm, loginEmail, register]);

  // Mantener contexto alineado con fullProfile
  useEffect(() => {
    if (!profile || !fullProfile?._id) return;
    if (String(fullProfile._id) !== profile._id) return;

    const normalizedEmail = (fullProfile.email || profile.email || '').toLowerCase();
    const name = fullProfile.name ?? profile.name ?? '';
    const role = fullProfile.role ?? profile.role ?? 'free';
    const createdAt = fullProfile.createdAt ?? profile.createdAt ?? Date.now();

    const hasDiff =
      profile.name !== name ||
      profile.role !== role ||
      (profile.email || '').toLowerCase() !== normalizedEmail;

    if (hasDiff) {
      setFromProfile({
        _id: String(fullProfile._id),
        name,
        email: normalizedEmail || profile.email || '',
        role: role as any,
        createdAt,
      });
    }
  }, [fullProfile, profile, setFromProfile]);

  const avatarUri = resolveAssetUrl((fullProfile as any)?.avatarUrl || (profile as any)?.avatarUrl);
  const roleChip = ROLE_CHIP_STYLES[profile?.role ?? 'free'];

  // Header PV
  const HeaderBar = (
    <View style={[styles.headerBar, { paddingTop: insets.top + spacing.xl }]}>
      <View style={{ width: 36, height: 36 }} />

      <View style={styles.centerLogoWrap}>
        <Image
          source={require('../../assets/branding/pv-logo-h28.png')}
          style={styles.centerLogo}
          resizeMode="contain"
        />
      </View>

      <Pressable
        onPress={() => navigation.navigate(userId ? ('Notifications' as any) : ('Profile' as any))}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Ir a notificaciones"
      >
        <Ionicons name="notifications-outline" size={18} color={colors.accent} />
        {userId && unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{Math.min(unreadCount, 9)}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );

  // ====== OAuth helpers ======
  const finishLoginWithEmail = async (email: string, name?: string) => {
    try {
      const prof: any = await (convexHttp as any).query(
        'queries/getUserByEmail:getUserByEmail',
        { email }
      );
      if (prof) {
        setFromProfile({
          _id: String(prof._id),
          name: prof.name || name || '',
          email: prof.email,
          role: prof.role || 'free',
          createdAt: prof.createdAt ?? Date.now(),
        });
      } else {
        // sesión local de cortesía (ajusta con tu mutation de alta si corresponde)
        setFromProfile({
          _id: `local:${email}`,
          name: name || email.split('@')[0],
          email,
          role: 'free' as any,
          createdAt: Date.now(),
        });
      }
      navigation.navigate('Tabs' as any, { screen: 'Home' } as any);
    } catch (e: any) {
      Alert.alert('Autenticación', e?.message || 'No se pudo sincronizar el perfil.');
    }
  };

  const handleGoogle = async () => {
    if (oauthLoading) return;
    setOauthLoading('google');
    try {
      const res = await signInWithGoogleNative();
      if (!res?.ok || !res.email) {
        Alert.alert('Google', res?.error || 'No se pudo completar la autorización.');
        return;
      }
      await finishLoginWithEmail(res.email, res.name);
    } finally {
      setOauthLoading(null);
    }
  };

  const handleMicrosoft = async () => {
    if (oauthLoading) return;
    setOauthLoading('microsoft');
    try {
      const res = await signInWithMicrosoftNative();
      if (!res?.ok || !res.email) {
        Alert.alert('Microsoft', res?.error || 'No se pudo completar la autorización.');
        return;
      }
      await finishLoginWithEmail(res.email, res.name);
    } finally {
      setOauthLoading(null);
    }
  };

  // ----- SIN SESIÓN -----
  if (!profile) {
    const leftOpacity = oauthLoading ? 0.6 : 1;
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.authContainer}>
        {/* Header provisto por el navigator (HeaderBar) */}

        <View style={styles.branding}>
          <Text style={styles.heroTitle}>Accede a tu cuenta o regístrate</Text>
        </View>

        <View style={styles.card}>
          {mode === 'register' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined }));
                }}
                placeholder="Tu nombre"
                placeholderTextColor="#9AB7C3"
                style={styles.input}
              />
              {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="tu@email.com"
              placeholderTextColor="#9AB7C3"
              style={styles.input}
            />
            {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
              }}
              secureTextEntry
              placeholder="Tu contraseña"
              placeholderTextColor="#9AB7C3"
              style={styles.input}
            />
            {fieldErrors.password ? (
              <Text style={styles.fieldError}>{fieldErrors.password}</Text>
            ) : null}
          </View>

          {mode === 'register' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Repetir contraseña</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  if (fieldErrors.confirmPassword) setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
                }}
                secureTextEntry
                placeholder="Repetí tu contraseña"
                placeholderTextColor="#9AB7C3"
                style={styles.input}
              />
              {fieldErrors.confirmPassword ? (
                <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>
              ) : null}
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Acciones: botón + link de alternar */}
          <View style={styles.actionsColumn}>
            <Button
              title={mode === 'login' ? (loading ? 'Ingresando...' : 'Ingresar') : loading ? 'Registrando...' : 'Registrarse'}
              onPress={handleSubmit}
              style={{ width: '100%' }}
              textStyle={{ textAlign: 'center' }}
            />
            <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
              <Text style={styles.switchAuthText}>
                {mode === 'login' ? '¿No tiene cuenta?' : '¿Ya tiene cuenta?'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Social login */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Ingresar con</Text>

          <View style={{ opacity: oauthLoading === 'google' ? 0.6 : 1 }}>
            <SocialButton
              provider="google"
              onPress={handleGoogle}
            />
            {oauthLoading === 'google' ? (
              <View style={{ marginTop: 0 }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : null}
          </View>

          <View style={{ height: 0 }} />

          <View style={{ opacity: oauthLoading === 'microsoft' ? 0.6 : 1 }}>
            <SocialButton
              provider="microsoft"
              onPress={handleMicrosoft}
            />
            {oauthLoading === 'microsoft' ? (
              <View style={{ marginTop: 0 }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : null}
          </View>
        </View>

        <FAQ onContactPress={handleContactPress} />
      </ScrollView>
    );
  }

  // ----- CON SESIÓN -----
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.profileContainer}>
      {/* Header provisto por el navigator (HeaderBar) */}

      <View style={styles.card}>
        <View style={styles.profileHeader}>

          <View style={[styles.rolePill, ROLE_CHIP_STYLES[profile?.role ?? 'free'].pill]}>
            <Text
              style={[
                styles.roleText,
                { color: ROLE_CHIP_STYLES[profile?.role ?? 'free'].text },
              ]}
            >
              {ROLE_CHIP_STYLES[profile?.role ?? 'free'].label}
            </Text>
          </View>

          <Pressable style={styles.avatar} onPress={() => setAvatarModal(true)}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={{ color: colors.accent, fontWeight: '700' }}>PV</Text>
            )}
          </Pressable>

          <Text style={[styles.value, { textAlign: 'center' }]}>
            {fullProfile?.name || profile.name || 'Jugador'}
          </Text>

          <Text style={[styles.label, { textAlign: 'center' }]}>{profile.email}</Text>

          <Button title="Cerrar sesión" variant="ghost" onPress={confirmLogout} />
        </View>
      </View>


      <View style={styles.listRow}>
        <View style={[styles.card, styles.listCol]}>
          <Text style={styles.sectionHeading}>Juegos comprados</Text>
          {(purchases ?? []).slice(0, 6).map((row: any) => (
            <GameRow
              key={String(row._id)}
              title={row.title || row.game?.title}
              cover={row.cover_url || row.game?.cover_url}
              note={`Comprado el ${new Date(row.createdAt).toLocaleDateString?.() ?? '-'}`}
            />
          ))}
          {(purchases ?? []).length === 0 ? <Text style={styles.label}>Sin compras.</Text> : null}
        </View>

        <View style={[styles.card, styles.listCol]}>
          <Text style={styles.sectionHeading}>Juegos alquilados</Text>
          {(rentals ?? []).slice(0, 6).map((row: any) => (
            <GameRow
              key={String(row._id)}
              title={row.title || row.game?.title}
              cover={row.cover_url || row.game?.cover_url}
              note={row.expiresAt ? `Expira ${new Date(row.expiresAt).toLocaleDateString?.() ?? '-'}` : ''}
            />
          ))}
          {(rentals ?? []).length === 0 ? <Text style={styles.label}>Sin alquileres.</Text> : null}
        </View>
      </View>

      <FAQ onContactPress={handleContactPress} />

      {/* Modal avatar grande */}
      <Modal visible={avatarModal} animationType="fade" transparent onRequestClose={() => setAvatarModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAvatarModal(false)}>
          <View style={styles.modalCard}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.bigAvatar} />
            ) : (
              <View style={[styles.bigAvatar, styles.coverFallback]}>
                <Text style={{ color: colors.accent, fontWeight: '900', fontSize: 28 }}>PV</Text>
              </View>
            )}
            <Pressable style={styles.modalClose} onPress={() => setAvatarModal(false)}>
              <Ionicons name="close" size={20} color="#0B2430" />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function GameRow({ title, cover, note }: { title?: string; cover?: string; note?: string }) {
  const uri = resolveAssetUrl(cover);
  return (
    <View style={styles.gameRow}>
      {uri ? (
        <Image source={{ uri }} style={styles.gameCover} />
      ) : (
        <View style={[styles.gameCover, styles.coverFallback]} />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.gameTitle}>{title || 'Juego'}</Text>
        {note ? <Text style={styles.helper}>{note}</Text> : null}
      </View>
    </View>
  );
}

function FAQ({ onContactPress }: { onContactPress: () => void }) {
  const [open, setOpen] = React.useState<number | null>(null);

  const items = [
    {
      q: '¿Cómo funciona el alquiler de juegos?',
      a: 'Podés alquilar cualquier juego por un período semanal y jugarlo las veces que quieras durante ese tiempo.',
    },
    {
      q: '¿Qué incluye la membresía Premium?',
      a: 'Acceso ilimitado a nuestra biblioteca, descuentos exclusivos y cero publicidad.',
    },
    {
      q: '¿Puedo cancelar mi suscripción?',
      a: 'Sí, podés cancelar en cualquier momento desde tu perfil. Los beneficios permanecen hasta el fin del ciclo pagado.',
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeading}>Preguntas frecuentes</Text>
      {items.map((it, idx) => (
        <View key={idx} style={{ marginTop: idx === 0 ? spacing.sm : spacing.xs }}>
          <Pressable
            onPress={() => setOpen(open === idx ? null : idx)}
            style={({ pressed }) => [
              styles.faqTrigger,
              pressed ? { backgroundColor: '#203745' } : null,
            ]}
          >
            <Text style={styles.faqQuestion} numberOfLines={1} ellipsizeMode="tail">{it.q}</Text>
            <Ionicons
              style={styles.faqChevron}
              name={open === idx ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.accent}
            />
          </Pressable>
          {open === idx ? (
            <View style={styles.faqAnswerWrap}>
              <Text style={styles.faqAnswer}>{it.a}</Text>
            </View>
          ) : null}
        </View>
      ))}
      <Button
        title="Contacto"
        variant="ghost"
        onPress={onContactPress}
        style={{ alignSelf: 'center', marginTop: spacing.lg }}
      />
    </View>
  );
}

function FAQStatic({ onContactPress }: { onContactPress: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeading}>Preguntas frecuentes</Text>
      <Text style={styles.label}>¿Cómo funciona el alquiler de juegos?</Text>
      <Text style={styles.label}>¿Qué incluye la membresía Premium?</Text>
      <Text style={styles.label}>¿Puedo cancelar mi suscripción?</Text>
      <Button
        title="Contacto"
        variant="ghost"
        onPress={onContactPress}
        style={{ alignSelf: 'center', marginTop: spacing.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  authContainer: { paddingBottom: spacing.xxl, gap: spacing.md },
  profileContainer: { paddingBottom: spacing.xxl, gap: spacing.md },

  /* Header propio (logo centrado) */
  headerBar: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#072633',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: '#0F2D3A',
  },
  centerLogoWrap: { flex: 1, alignItems: 'center' },
  centerLogo: { height: 28, width: 120 },

  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  branding: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  heroTitle: { color: colors.accent, fontSize: typography.h1, fontWeight: '900', textAlign: 'center' },

  card: {
    backgroundColor: '#0B2430',
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
  },

  fieldGroup: { gap: 6, marginTop: 2 },
  label: { color: colors.accent, fontSize: typography.body },
  value: { color: colors.accent, fontSize: typography.h3, fontWeight: '700' },
  input: {
    backgroundColor: '#0B2430',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radius.md,
    color: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  error: { color: '#ff7675' },
  fieldError: { color: '#ff9191', fontSize: typography.caption, marginTop: 4 },

  /* Acciones opuestas en el card */
  actionsRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsColumn: {
    marginTop: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  switchAuthText: {
    color: colors.accent,
    fontSize: typography.body,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 6,
  },

  sectionHeading: { color: colors.accent, fontWeight: '800', fontSize: typography.h3 },
  helper: { color: '#D1D5DB', fontSize: typography.caption },

  // FAQ
  faqTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    width: '100%',
    flexWrap: 'nowrap',
    minHeight: 44,
    backgroundColor: '#0F2D3A',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingRight: spacing.xl,
  },
  faqQuestion: {
    color: '#D9E7EF',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
    lineHeight: typography.body,
    includeFontPadding: false as any,
    paddingRight: spacing.sm,
    marginTop: 4,
  },
  faqChevron: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -10,
  },
  faqAnswerWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  faqAnswer: {
    color: '#9AB9C6',
    fontSize: typography.caption,
  },

  profileHeader: { flexDirection: 'column', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0B2430',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#0ea5b5',
    shadowColor: '#0ea5b5',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarImage: { width: '100%', height: '100%' },

  roleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rolePill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: '#1B2F3B',
    borderColor: '#A4C9D3',
  },
  roleText: { fontSize: typography.caption, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },

  notificationButton: {
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#F2B70522',
  },
  notificationTitle: { color: colors.accent, fontWeight: '700' },

  listRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  listCol: { flex: 1, minWidth: 280 },
  gameRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  gameCover: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: '#0F2D3A' },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  gameTitle: {
    color: colors.accent,
    fontSize: typography.body,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  /* Modal avatar grande */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: '#0B2430',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#0ea5b5',
    shadowColor: '#0ea5b5',
    shadowOpacity: 0.7,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
  },
  bigAvatar: { width: 240, height: 240, borderRadius: 120 },
  modalClose: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#F2B705',
    borderRadius: 14,
    padding: 6,
  },
});
