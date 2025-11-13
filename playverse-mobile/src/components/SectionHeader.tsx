import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../styles/theme';

export default function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  title: { color: colors.accent, fontSize: typography.h2, fontWeight: '900' },
  subtitle: { color: colors.accent, opacity: 0.9 },
});

