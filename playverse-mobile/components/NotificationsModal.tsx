import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void; }) {
  const cs = useColorScheme(); const colors = Colors[cs ?? 'light'];
  const [enabled, setEnabled] = useState(true);
  const [items, setItems] = useState([
    { id: '1', type: 'warning', title: '¡Tu alquiler vence mañana!', message: 'Renová para seguir jugando.', time: 'Hace 5m', isRead: false },
    { id: '2', type: 'info', title: 'Nuevo juego: "Cyberpunk 2077"', message: 'Disponible en catálogo.', time: 'Hace 1h', isRead: false },
    { id: '3', type: 'success', title: 'Pago procesado', message: 'Suscripción renovada.', time: 'Hace 1d', isRead: true }
  ]);
  const unread = items.filter(i => !i.isRead).length;

  const colorType = (type: string) =>
    type === 'warning' ? '#FF6B6B' : type === 'info' ? '#4ECDC4' : type === 'success' ? '#45B7D1' : colors.gray;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor: colors.background }}>
        <View style={styles.header}>
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <Text style={[styles.headerTitle, { color: colors.white }]}>Notificaciones</Text>
            {unread > 0 && <View style={[styles.badge, { backgroundColor: colors.accent }]}><Text style={[styles.badgeText, { color: colors.white }]}>{unread}</Text></View>}
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}><Ionicons name="close" size={24} color={colors.white} /></TouchableOpacity>
        </View>

        <View style={[styles.toggle, { borderColor: colors.secondary }]}>
          <View style={{ flexDirection:'row', alignItems:'center' }}>
            <Ionicons name="notifications" size={20} color={colors.white} />
            <Text style={{ color: colors.white, fontWeight:'600', marginLeft: 12 }}>Notificaciones</Text>
          </View>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: colors.gray, true: colors.accent }} thumbColor={colors.white} />
        </View>

        <ScrollView style={{ flex:1, paddingHorizontal:20 }} showsVerticalScrollIndicator={false}>
          {items.map(n => (
            <TouchableOpacity key={n.id} style={[styles.item, { backgroundColor: n.isRead ? 'transparent' : colors.cardBackground, borderColor: colors.secondary }]} onPress={() => setItems(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x))}>
              <View style={{ flexDirection:'row', alignItems:'flex-start', flex:1 }}>
                <View style={[styles.icon, { backgroundColor: colorType(n.type) }]}><Ionicons name="information-circle" size={16} color={colors.white} /></View>
                <View style={{ flex:1 }}>
                  <Text style={{ color: colors.white, fontWeight: n.isRead ? 'normal' : 'bold', marginBottom:4 }}>{n.title}</Text>
                  <Text style={{ color: colors.gray, marginBottom:4 }}>{n.message}</Text>
                  <Text style={{ color: colors.gray, fontSize:12 }}>{n.time}</Text>
                </View>
              </View>
              {!n.isRead && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingTop:30,paddingBottom:20},
  headerTitle:{fontSize:24,fontWeight:'bold'}, badge:{minWidth:20,height:20,borderRadius:10,justifyContent:'center',alignItems:'center',paddingHorizontal:6,marginLeft:8},
  badgeText:{fontSize:12,fontWeight:'bold'}, closeButton:{width:40,height:40,borderRadius:20,backgroundColor:'rgba(255,255,255,0.1)',justifyContent:'center',alignItems:'center'},
  toggle:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginHorizontal:20,marginBottom:20,padding:16,borderRadius:12,borderWidth:1},
  item:{flexDirection:'row',alignItems:'center',padding:16,marginBottom:12,borderRadius:12,borderWidth:1}, icon:{width:32,height:32,borderRadius:16,justifyContent:'center',alignItems:'center',marginRight:12},
  dot:{width:8,height:8,borderRadius:4,marginLeft:8}
});
