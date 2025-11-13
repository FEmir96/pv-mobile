import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, Image, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function GameDetailModal({
  visible,
  onClose,
  game
}: {
  visible: boolean;
  onClose: () => void;
  game?: {
    id: string;
    title: string;
    genre: string;
    rating: number;
    description: string;
    rentalPrice?: string;
    purchasePrice?: string;
  } | null;
}) {
  const cs = useColorScheme();
  const colors = Colors[cs ?? 'light'];
  if (!visible) return null;

  const g = game ?? {
    id: '1',
    title: 'Juego',
    genre: 'Acción',
    rating: 4.5,
    description: 'Descripción del juego',
    rentalPrice: '$2,99/sem',
    purchasePrice: '$19,99'
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.secondary }]}>{g.title}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.heroArt}><Ionicons name="game-controller" size={56} color={colors.white} /></View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>Descripción</Text>
            <Text style={{ color: colors.gray, lineHeight: 20 }}>{g.description}</Text>
          </View>

          <View style={[styles.pricing, { borderColor: colors.secondary }]}>
            <View><Text style={[styles.priceLabel, { color: colors.gray }]}>Alquiler</Text><Text style={[styles.price, { color: colors.white }]}>{g.rentalPrice}</Text></View>
            <View><Text style={[styles.priceLabel, { color: colors.gray }]}>Compra</Text><Text style={[styles.price, { color: colors.white }]}>{g.purchasePrice}</Text></View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 30, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: 'bold' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  hero: { height: 220, justifyContent: 'center', alignItems: 'center' },
  heroArt: { width: 120, height: 120, borderRadius: 12, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  pricing: { margin: 20, padding: 16, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { fontSize: 12, marginBottom: 4 },
  price: { fontSize: 16, fontWeight: 'bold' }
});
