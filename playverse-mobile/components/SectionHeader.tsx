import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function SectionHeader({
  title,
  subtitle,
  showSeeAll = false,
  onSeeAll,
}: {
  title: string;
  subtitle?: string;
  showSeeAll?: boolean;
  onSeeAll?: () => void;
}) {
  const cs = useColorScheme();
  const colors = Colors[cs ?? 'light'];

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.secondary }]}>{title}</Text>
        {!!subtitle && <Text style={[styles.subtitle, { color: colors.white }]}>{subtitle}</Text>}
      </View>
      {showSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={[styles.seeAllText, { color: colors.accent }]}>Ver todo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 16 },
  textContainer: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14, opacity: 0.8 },
  seeAllText: { fontSize: 16, fontWeight: '600' }
});
