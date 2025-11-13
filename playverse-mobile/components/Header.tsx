import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function Header() {
  const cs = useColorScheme();
  const colors = Colors[cs ?? 'light'];
  const router = useRouter();

  return (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <View style={styles.logoContainer}>
        <Image source={require('@/assets/images/playverse-logo.png')} style={styles.logoImage} resizeMode="contain" />
      </View>
      <View style={styles.rightButtons}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)/library')}>
          <Ionicons name="book-outline" size={22} color={colors.secondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)/my-games')}>
          <Ionicons name="game-controller-outline" size={22} color={colors.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 50, paddingBottom: 10 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { width: 90, height: 30 },
  rightButtons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconButton: { padding: 6 }
});
