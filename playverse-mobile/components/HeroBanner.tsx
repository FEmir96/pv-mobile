import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Ionicons } from '@expo/vector-icons';

export default function HeroBanner() {
  const cs = useColorScheme(); const colors = Colors[cs ?? 'light'];
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={colors.heroGradient} style={styles.gradient}>
        <View style={styles.content}>
          <Ionicons name="game-controller" size={36} color={colors.secondary} style={{ marginBottom: 12 }} />
          <Text style={[styles.title, { color: colors.secondary }]}>PLAYVERSE</Text>
          <Text style={[styles.subtitle, { color: colors.white }]}>
            Bienvenido al universo de los videojuegos. Alquila o compra tus favoritos en un solo lugar.
          </Text>
          <TouchableOpacity style={[styles.exploreButton, { backgroundColor: colors.accent }]} onPress={() => router.push('/(tabs)/catalog')}>
            <Text style={[styles.buttonText, { color: colors.primary }]}>Explorar</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}
const styles = StyleSheet.create({
  container:{ height: 240 }, gradient:{ flex:1, position:'relative' },
  content:{ flex:1, justifyContent:'center', alignItems:'center', paddingHorizontal:20 },
  title:{ fontSize: 32, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  subtitle:{ fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 20, opacity: 0.9 },
  exploreButton:{ paddingHorizontal: 32, paddingVertical: 12, borderRadius: 25 },
  buttonText:{ fontSize: 16, fontWeight: 'bold' }
});
