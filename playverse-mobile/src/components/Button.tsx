import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, GestureResponderEvent } from 'react-native';
import { colors, radius, spacing, typography } from '../styles/theme';

type Variant = 'primary' | 'ghost';

type Props = {
  title: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: Variant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
};

// Small reusable button that fits PlayVerse brand.
// - primary: filled with accent color
// - ghost: transparent, accent border
export default function Button({ title, onPress, variant = 'primary', style, textStyle, disabled }: Props) {
  const { buttonClass, textClass } = useMemo(() => {
    const base =
      'rounded-pill px-lg py-sm transition-transform duration-150 active:scale-95 active:opacity-90';
    if (variant === 'primary') {
      return {
        buttonClass: `${base} bg-accent shadow-card`,
        textClass: 'text-[#1B1B1B] text-body font-bold',
      };
    }
    return {
      buttonClass: `${base} border-2 border-accent bg-transparent active:border-accentAlt`,
      textClass: 'text-accent text-body font-bold',
    };
  }, [variant]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`${buttonClass} ${disabled ? 'opacity-50 active:scale-100 active:opacity-50' : ''}`}
      style={[styles.fallbackBase, variant === 'primary' ? styles.fallbackPrimary : styles.fallbackGhost, style]}
    >
      <Text className={textClass} style={[styles.fallbackText, variant === 'primary' ? styles.fallbackTextPrimary : styles.fallbackTextGhost, textStyle]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fallbackBase: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignSelf: 'auto',
  },
  fallbackPrimary: {
    backgroundColor: colors.accent,
  },
  fallbackGhost: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
  },
  fallbackText: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  fallbackTextPrimary: {
    color: '#1B1B1B',
  },
  fallbackTextGhost: {
    color: colors.accent,
  },
});
