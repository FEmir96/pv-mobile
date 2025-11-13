import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../styles/theme';

type Props = {
  provider: 'google' | 'microsoft';
  title?: string;
  onPress?: () => void;
  style?: ViewStyle;
};

const brand = {
  google: { border: 'rgba(242, 183, 5, 0.4)', icon: 'logo-google' as const },
  microsoft: { border: 'rgba(16,124,16,0.6)', icon: 'logo-xbox' as const },
};

export default function SocialButton({ provider, title, onPress, style }: Props) {
  const conf = brand[provider];
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.base, { borderColor: conf.border }, style]}> 
      <View style={styles.row}>
        <Ionicons name={conf.icon} size={18} color={provider === 'google' ? '#ffffff' : '#107C10'} />
        <Text style={styles.text}>{title ?? (provider === 'google' ? 'Continuar con Google' : 'Continuar con Xbox')}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: '#0B2430',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  text: {
    color: colors.accent,
    fontWeight: '700',
  },
});


