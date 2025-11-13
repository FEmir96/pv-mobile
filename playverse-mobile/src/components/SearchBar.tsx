import React from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../styles/theme';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  hasActiveFilter?: boolean;
};

export default function SearchBar({ value, onChangeText, placeholder, onFilterPress, hasActiveFilter }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="search" size={18} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || 'Buscar por título...'}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
      />
      <Pressable
        onPress={onFilterPress}
        accessibilityRole="button"
        accessibilityLabel="Abrir filtros"
        style={{ padding: 6, borderRadius: 16 }}
      >
        <Ionicons name="filter" size={18} color={hasActiveFilter ? colors.accent : colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#0B2430',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    color: 'white',
  },
});

