import React from 'react';
import { Pressable, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, typography, shadows } from '../styles/theme';

type Props = {
  onPress?: () => void;
};

export default function PremiumBanner({ onPress }: Props) {
  return (
    <LinearGradient
      colors={['#fb923c4D', '#14b8a64D', '#9333ea4D']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.5, 1]}
      style={styles.wrap}
    >
      <Pressable
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Descubre Premium"
      >
        <View style={styles.textStack}>
          <Text style={styles.title}>Listo para una experiencia premium?</Text>
          <Text style={styles.subtitle}>
            Catalogo ilimitado, descuentos exclusivos, cero publicidad y mucho mas
          </Text>

          <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.discoverButton}>
            <Text style={styles.discoverButtonText}>Descubre Premium</Text>
            <Ionicons name="arrow-forward" size={14} color="#6B21A8" />
          </TouchableOpacity>
        </View>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadows.card,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.96,
  },
  textStack: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textPrimary,
    opacity: 0.9,
    fontSize: typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.pill,
    gap: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  discoverButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: '#6B21A8',
  },
});

