import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { convexHttp } from '../lib/convexClient';
import { colors, radius, spacing, typography } from '../styles/theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

type FormErrors = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
};

export default function ContactScreen(): React.ReactElement {
  const { profile } = useAuth();

  const initialProfileValues = useMemo(
    () => ({
      name: profile?.name?.trim() ?? '',
      email: profile?.email?.trim().toLowerCase() ?? '',
    }),
    [profile?.name, profile?.email]
  );

  const [name, setName] = useState(initialProfileValues.name);
  const [email, setEmail] = useState(initialProfileValues.email);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(initialProfileValues.name);
    setEmail(initialProfileValues.email);
  }, [initialProfileValues.name, initialProfileValues.email]);

  const clearError = (field: keyof FormErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const next: FormErrors = {};
    if (!name.trim() || name.trim().length < 2) {
      next.name = 'Ingresa tu nombre completo.';
    }
    if (!EMAIL_RE.test(email.trim().toLowerCase())) {
      next.email = 'Ingresa un email valido.';
    }
    if (!subject.trim() || subject.trim().length < 3) {
      next.subject = 'Cuentanos brevemente el motivo.';
    }
    if (!message.trim() || message.trim().length < 10) {
      next.message = 'El mensaje debe tener al menos 10 caracteres.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const sanitizedEmail = email.trim().toLowerCase();
      const payload: Record<string, any> = {
        name: name.trim(),
        email: sanitizedEmail,
        subject: subject.trim(),
        message: message.trim(),
      };

      if (profile?._id && !profile._id.startsWith('local:')) {
        payload.profileId = profile._id;
      } else {
        payload.profileId = null;
      }

      payload.userAgent = `playverse-mobile/${Platform.OS} ${Platform.Version ?? ''}`.trim();

      await (convexHttp as any).action('actions/contact:submitContact', payload);

      Alert.alert('Consulta enviada!', 'Gracias por escribirnos. Te responderemos a la brevedad.');
      setSubject('');
      setMessage('');
      if (!profile) {
        setName('');
        setEmail('');
      }
      setErrors({});
    } catch (err: any) {
      Alert.alert('No se pudo enviar', err?.message ?? 'Intentalo nuevamente en unos minutos.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>CONTACTO</Text>
        <Text style={styles.heroSubtitle}>
          ¿Tienes alguna pregunta o necesitas ayuda? Estamos aquí para ayudarte, contactanos y te responderemos lo antes
          posible.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="chatbubbles" size={22} color={colors.accent} />
          <Text style={styles.cardHeaderText}>Envianos un mensaje</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              clearError('name');
            }}
            placeholder="Tu nombre"
            placeholderTextColor="#9AB7C3"
            style={[styles.input, errors.name ? styles.inputError : undefined]}
            autoCapitalize="words"
            editable={!submitting}
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              clearError('email');
            }}
            placeholder="tu@email.com"
            placeholderTextColor="#9AB7C3"
            style={[styles.input, errors.email ? styles.inputError : undefined]}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            editable={!submitting}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Asunto</Text>
          <TextInput
            value={subject}
            onChangeText={(text) => {
              setSubject(text);
              clearError('subject');
            }}
            placeholder="En que podemos ayudarte?"
            placeholderTextColor="#9AB7C3"
            style={[styles.input, errors.subject ? styles.inputError : undefined]}
            editable={!submitting}
          />
          {errors.subject ? <Text style={styles.errorText}>{errors.subject}</Text> : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Mensaje</Text>
          <TextInput
            value={message}
            onChangeText={(text) => {
              setMessage(text);
              clearError('message');
            }}
            placeholder="Cuentanos los detalles..."
            placeholderTextColor="#9AB7C3"
            style={[styles.input, styles.multilineInput, errors.message ? styles.inputError : undefined]}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            editable={!submitting}
          />
          {errors.message ? <Text style={styles.errorText}>{errors.message}</Text> : null}
        </View>

        <Button
          title={submitting ? 'Enviando...' : 'Enviar mensaje'}
          onPress={handleSubmit}
          disabled={submitting}
          style={{ alignItems: 'center', alignSelf: 'stretch', marginTop: spacing.md }}
        />
      </View>

      <View style={styles.infoGrid}>
        <ContactInfoCard
          icon="mail"
          title="Email"
          lines={['soporte@playverse.com', 'ventas@playverse.com']}
        />
        <ContactInfoCard
          icon="call"
          title="Telefono"
          lines={['+1 (555) 123-4567', 'Lun - Vie: 9:00 AM - 6:00 PM']}
        />
      </View>
    </ScrollView>
  );
}

function ContactInfoCard({
  icon,
  title,
  lines,
}: {
  icon: 'mail' | 'call';
  title: string;
  lines: string[];
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={20} color="#0B2430" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoTitle}>{title}</Text>
        {lines.map((line, index) => (
          <Text key={`${title}-${index}`} style={styles.infoText}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  hero: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  heroTitle: {
    color: colors.accent,
    fontSize: typography.h1,
    fontWeight: '900',
    letterSpacing: 1.2,
    alignSelf: 'center'
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 20,
    alignSelf: 'center',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#0B2430',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.xl,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardHeaderText: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: typography.h3,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    color: colors.textPrimary,
    fontSize: typography.body,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#102F3D',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  multilineInput: {
    minHeight: 120,
  },
  inputError: {
    borderColor: '#ff7675',
  },
  errorText: {
    color: '#ff8b8b',
    fontSize: typography.caption,
  },
  infoGrid: {
    gap: spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: '#0B2430',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.lg,
    alignItems: 'center',
  },
  infoIcon: {
    width: 44,
    height: 44,
    backgroundColor: colors.accent,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    color: colors.accent,
    fontSize: typography.h3,
    fontWeight: '800',
  },
  infoText: {
    color: colors.textPrimary,
    fontSize: typography.body,
  },
});
