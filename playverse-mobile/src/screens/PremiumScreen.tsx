import React from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, radius } from '../styles/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

export default function PremiumScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const benefits = [
    { icon: 'download', title: 'Acceso ilimitado', description: 'Descarga y juega todos los juegos sin restricciones' },
    { icon: 'hand-left', title: 'Cero publicidad', description: 'Disfruta sin interrupciones ni banners' },
    { icon: 'star', title: 'Descuentos exclusivos', description: 'Hasta 10% de descuento en todas las compras' },
  ];

  const plans = [
    {
      id: 'monthly',
      name: 'Mensual',
      price: '$9,99',
      period: '/mes',
      description: 'Perfecto para probar',
      features: ['Acceso total', 'Descuentos 10%', 'Cero publicidad', 'Soporte prioritario'],
      popular: false,
    },
    {
      id: 'annual',
      name: 'Anual',
      price: '$89,99',
      period: '/año',
      originalPrice: '$119,99',
      savings: 'Ahorra $30',
      description: 'La mas conveniente',
      features: ['3 meses gratis', 'Todo lo de mensual', 'Acceso anticipado'],
      popular: true,
    },
    {
      id: 'quarterly',
      name: 'Trimestral',
      price: '$24,99',
      period: '/3 meses',
      description: 'Equilibrio precio/frecuencia',
      features: ['Mejor precio que mensual', 'Todo lo de mensual', 'Renovacion cada 3 meses'],
      popular: false,
    },
  ] as const;

  const handleGoToWeb = (url: string) => {
    Alert.alert(
      'Ir a la web',
      'Para suscribirte a Premium te llevamos a la web. Abrir navegador?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir', onPress: () => Linking.openURL(url) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Usa el header global del navigator (HeaderBar) */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={['#fb923c4D', '#14b8a64D', '#9333ea4D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.5, 1]}
          style={styles.hero}
        >
          <View style={[styles.premiumBadge, { backgroundColor: 'rgba(209, 147, 16, 0.2)', borderColor: '#d19310' }, { marginBottom: spacing.lg } ]}>
            <Ionicons name="star" size={16} color={'#d19310'} />
            <Text style={[styles.premiumBadgeText, { color: '#d19310' }]}>Premium</Text>
          </View>

          <Text style={styles.heroTitle}>Desbloquea el</Text>

          <View style={[styles.gradientTextContainer, { marginBottom: spacing.md }]}>
            <LinearGradient
              colors={['#fb923c80', '#14b8a680', '#9333ea80']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientTextBackground}
            >
              <Text style={[styles.gradientText, { color: '#ffffff' }]}>
                poder del gaming
              </Text>
            </LinearGradient>
          </View>

          <Text style={[styles.heroSubtitle, { marginBottom: spacing.xxl, marginTop: spacing.xs }]}>
            Accede a toda la biblioteca, descuentos exclusivos y experiencia sin publicidad.
          </Text>

          <View style={styles.trialPill}>
            <Text style={styles.trialText}>Prueba gratuita de 7 dias</Text>
          </View>
          <Text style={styles.webHint}>Suscripciones disponibles en la web</Text>
        </LinearGradient>

        {/* Beneficios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por que elegir Premium?</Text>
          <Text style={styles.sectionSubtitle}>Descubre los beneficios</Text>
          <View style={{ gap: spacing.lg }}>
            {benefits.map((b, i) => (
              <View key={i} style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <Ionicons name={b.icon as any} size={22} color={colors.background} />
                </View>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDesc}>{b.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Planes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Elige tu plan</Text>
          <View style={{ gap: spacing.xl }}>
            {plans.map((p) => (
              <View key={p.id} style={{ position: 'relative' }}>
                {p.popular ? (
                  <View style={styles.popularFlag}>
                    <View style={styles.popularFlagInner}>
                      <Text style={styles.popularFlagText}>Mas popular</Text>
                    </View>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.planCard,
                    { borderColor: p.popular ? colors.accent : '#94A3B8', borderWidth: p.popular ? 2 : 1 },
                  ]}
                >
                  <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                    <Text style={styles.planName}>{p.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                      <Text style={styles.planPrice}>{p.price}</Text>
                      <Text style={styles.planPeriod}>{p.period}</Text>
                    </View>
                    {'originalPrice' in p && (p as any).originalPrice ? (
                      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                        <Text style={styles.originalPrice}>{(p as any).originalPrice}</Text>
                        <Text style={styles.savings}>{(p as any).savings}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.planDesc}>{p.description}</Text>
                  </View>

                  <View style={{ gap: spacing.sm }}>
                    {p.features.map((f, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons name="checkmark" size={16} color={colors.accent} />
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                    <Text style={styles.notice}>Para suscribirte visita nuestra web</Text>
                    <TouchableOpacity
                      style={styles.cta}
                      onPress={() => handleGoToWeb('https://playverse.com/premium')}
                    >
                      <Text style={styles.ctaText}>Abrir web</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  hero: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xl, alignItems: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    backgroundColor: colors.accent,
    marginBottom: 24,
    gap: 8,
  },
  badgeText: { color: colors.background, fontWeight: 'bold' },
  heroTitle: { color: '#fff', fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  gradientWord: {
    marginBottom: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  gradientWordText: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  heroSubtitle: { color: '#fff', opacity: 0.9, fontSize: 16, lineHeight: 22, textAlign: 'center', marginBottom: 18, paddingHorizontal: 6 },
  trialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: colors.accent,
    gap: 8,
    marginBottom: 6,
  },
  trialText: { color: colors.background, fontWeight: 'bold' },
  webHint: { color: '#d2e8f1', opacity: 0.8, textAlign: 'center' },

  section: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
  sectionTitle: { color: colors.accent, fontSize: typography.h2, fontWeight: '900', textAlign: 'center', marginBottom: spacing.md },
  sectionSubtitle: { color: colors.accent, opacity: 0.9, textAlign: 'center', marginBottom: spacing.lg },

  benefitCard: { alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#1F546B', backgroundColor: '#0F2D3A' },
  benefitIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, marginBottom: 12 },
  benefitTitle: { color: colors.accent, fontWeight: '900', fontSize: 18, marginBottom: 6, textAlign: 'center' },
  benefitDesc: { color: '#D6EEF7', opacity: 0.9, textAlign: 'center' },

  planCard: { borderRadius: 20, padding: 20, backgroundColor: '#0F2D3A' },
  planName: { color: colors.accent, fontSize: 20, fontWeight: '900', marginBottom: 6 },
  planPrice: { color: '#fff', fontSize: 32, fontWeight: '900' },
  planPeriod: { color: '#fff', opacity: 0.9 },
  originalPrice: { color: '#D6EEF7', textDecorationLine: 'line-through' },
  savings: { color: '#fff', fontWeight: 'bold' },
  planDesc: { color: '#D6EEF7', opacity: 0.9, textAlign: 'center', marginTop: spacing.xs },
  featureText: { color: "#fff" , flex: 1 },
  notice: { color: '#9ED3E6', fontStyle: 'italic', marginBottom: spacing.sm },
  cta: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 10 },
  ctaText: { fontWeight: '800', backgroundColor: 'transparent' },

  popularFlag: { position: 'absolute', top: -10, left: 0, right: 0, alignItems: 'center', zIndex: 1 },
  popularFlagInner: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 25, backgroundColor: colors.accent },
  popularFlagText: { color: colors.background, fontWeight: 'bold' },

  gradientTextContainer: {
    marginBottom: 32,
    alignSelf: 'center',
  },
  gradientTextBackground: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  gradientText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 1,
    marginBottom: 32,
    gap: 8,
  },
  premiumBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});



