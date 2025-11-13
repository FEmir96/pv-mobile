import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography } from '../styles/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

export default function HeroBanner() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleExplorePress = () => {
    nav.navigate('Tabs' as any, { screen: 'Catalog' } as any);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.surface, colors.background]}
        style={styles.gradient}
      >
        <View style={styles.backgroundElements}>
          <Image source={require('../../assets/images/hongo.png')} style={[styles.decorativeImage, styles.mushroom]} resizeMode="contain" />
          <Image source={require('../../assets/images/estrella.png')} style={[styles.decorativeImage, styles.star1]} resizeMode="contain" />
          <Image source={require('../../assets/images/moneda.png')} style={[styles.decorativeImage, styles.coin]} resizeMode="contain" />
          <Image source={require('../../assets/images/control.png')} style={[styles.decorativeImage, styles.gamepad]} resizeMode="contain" />
          <Image source={require('../../assets/images/rob1.png')} style={[styles.decorativeImage, styles.bot1]} resizeMode="contain" />
          <Image source={require('../../assets/images/rob2.png')} style={[styles.decorativeImage, styles.bot2]} resizeMode="contain" />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>PLAYVERSE</Text>
          <Text style={styles.subtitle}>
            Bienvenido al universo de los videojuegos. Alquila o compra tus favoritos en un solo lugar.
          </Text>
          <TouchableOpacity style={styles.exploreButton} onPress={handleExplorePress} activeOpacity={0.9}>
            <Text style={styles.buttonText}>Explorar</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 260, backgroundColor: colors.background },
  gradient: { flex: 1, position: 'relative', overflow: 'hidden' },
  backgroundElements: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  decorativeImage: { position: 'absolute' },
  mushroom: { width: 30, height: 30, top: 40, right: 60 },
  star1: { width: 20, height: 20, top: 90, right: 20 },
  coin: { width: 20, height: 20, top: 160, right: 80 },
  gamepad: { width: 32, height: 24, top: 60, left: 40 },
  bot1: { width: 20, height: 20, top: 170, left: 80 },
  bot2: { width: 28, height: 28, top: 130, left: 20 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl, zIndex: 1 },
  title: { fontSize: 38, fontWeight: 'bold', fontStyle: 'italic', marginBottom: spacing.md, textAlign: 'center', color: colors.accent },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: spacing.lg, opacity: 0.9, color: colors.textPrimary },
  exploreButton: { paddingHorizontal: 32, paddingVertical: 10, borderRadius: 25, backgroundColor: colors.accent, marginBottom: spacing.lg },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
});
