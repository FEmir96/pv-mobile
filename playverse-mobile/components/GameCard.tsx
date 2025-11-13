import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export type CardType = 'catalog' | 'my-games' | 'favorites' | 'purchases';

export default function GameCard({
  title,
  genre,
  rating,
  description,
  rentalPrice,
  purchasePrice,
  validUntil,
  cardType = 'catalog',
  onPress,
  onFavorite,
  onReminder,
}: {
  title: string;
  genre: string;
  rating: number;
  description: string;
  rentalPrice?: string;
  purchasePrice?: string;
  validUntil?: string;
  cardType?: CardType;
  onPress?: () => void;
  onFavorite?: () => void;
  onReminder?: () => void;
}) {
  const cs = useColorScheme();
  const colors = Colors[cs ?? 'light'];

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.cardBackground }]} onPress={onPress}>
      <View style={styles.imageContainer}>
        <View style={styles.genreTag}><Text style={[styles.genreText, { color: colors.primary }]}>{genre}</Text></View>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={12} color={colors.secondary} />
          <Text style={[styles.ratingText, { color: colors.white }]}>{rating}</Text>
        </View>
        <View style={[styles.gameImage]}><Ionicons name="game-controller" size={30} color={colors.white} /></View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={cardType === 'catalog' ? onFavorite : onReminder}>
            <Ionicons name={cardType === 'catalog' ? 'heart-outline' : 'notifications-outline'} size={20} color={colors.secondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.description, { color: colors.gray }]} numberOfLines={2}>{description}</Text>

        {cardType === 'my-games' ? (
          <Text style={[styles.validUntil, { color: '#00e0d1' }]}>Válido hasta el {validUntil}</Text>
        ) : cardType === 'purchases' ? (
          <Text style={[styles.purchasedText, { color: '#00e065' }]}>Comprado</Text>
        ) : (
          <View style={styles.pricingRow}>
            <View><Text style={[styles.priceLabel, { color: colors.gray }]}>Alquiler</Text><Text style={[styles.price, { color: colors.white }]}>{rentalPrice}</Text></View>
            <View style={{ alignItems: 'flex-end' }}><Text style={[styles.priceLabel, { color: colors.gray }]}>Compra</Text><Text style={[styles.price, { color: colors.gray }]}>{purchasePrice}</Text></View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 12, marginHorizontal: 4, width: 160, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  imageContainer: { position: 'relative', marginBottom: 12 },
  genreTag: { position: 'absolute', top: 8, left: 8, backgroundColor: '#d19310', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, zIndex: 1 },
  genreText: { fontSize: 10, fontWeight: 'bold' },
  ratingContainer: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, zIndex: 1 },
  ratingText: { fontSize: 10, fontWeight: 'bold', marginLeft: 2 },
  gameImage: { width: '100%', height: 100, borderRadius: 8, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 14, fontWeight: 'bold', flex: 1, marginRight: 8 },
  description: { fontSize: 11, lineHeight: 14, marginBottom: 8 },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { fontSize: 10, marginBottom: 2 },
  price: { fontSize: 12, fontWeight: 'bold' },
  validUntil: { fontSize: 12, fontWeight: '600' },
  purchasedText: { fontSize: 12, fontWeight: '600' }
});
