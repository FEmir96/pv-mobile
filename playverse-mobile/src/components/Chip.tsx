import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../styles/theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export default function Chip({ label, selected, onPress, style }: Props) {
  const baseClass =
    'rounded-pill border px-md py-[6px] transition-transform duration-150 active:scale-95 active:bg-surface/70';
  const selectedClass = selected ? 'bg-accent border-accent shadow-card' : 'bg-transparent border-surfaceBorder';
  const textClass = selected
    ? 'text-[#1B1B1B] text-caption font-extrabold'
    : 'text-textSecondary text-caption font-extrabold';

  return (
    <Pressable
      onPress={onPress}
      className={`${baseClass} ${selectedClass}`}
      style={[styles.base, selected ? styles.sel : styles.unsel, style]}
    >
      <Text className={textClass} style={[styles.text, selected ? styles.textSel : styles.textUnsel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  sel: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  unsel: {
    backgroundColor: 'transparent',
    borderColor: colors.surfaceBorder,
  },
  text: {
    fontSize: typography.caption,
    fontWeight: '800',
  },
  textSel: { color: '#1B1B1B' },
  textUnsel: { color: colors.textSecondary },
});

