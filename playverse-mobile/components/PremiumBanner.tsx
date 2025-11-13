import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function PremiumBanner() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const handleDiscoverPremium = () => {
    router.push('/premium');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleDiscoverPremium} activeOpacity={0.9}>
      <LinearGradient
        colors={colors.premiumGradient}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.white }]}>
            ¿Listo para una experiencia premium?
          </Text>
          <Text style={[styles.subtitle, { color: colors.white }]}>
            Catálogo ilimitado, descuentos exclusivos, cero publicidad y mucho más
          </Text>
          
          <TouchableOpacity 
            style={[styles.discoverButton, { backgroundColor: colors.white }]}
            onPress={handleDiscoverPremium}
          >
            <Text style={[styles.discoverButtonText, { color: '#6B21A8' }]}>
              Descubre Premium
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#6B21A8" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 36,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.9,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
  },
});
