import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function ContactModal({ visible, onClose }: { visible: boolean; onClose: () => void; }) {
  const cs = useColorScheme(); const colors = Colors[cs ?? 'light'];
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const setField = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor: colors.background }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.secondary }]}>CONTACTO</Text>
          <TouchableOpacity style={styles.close} onPress={onClose}><Ionicons name="close" size={24} color={colors.white} /></TouchableOpacity>
        </View>

        <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
          <Text style={{ color: colors.white, textAlign: 'center', marginBottom: 24, opacity: 0.9 }}>
            ¿Dudas o ayuda? Escribinos y respondemos lo antes posible.
          </Text>

          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.secondary }]}>
            <View style={styles.row}><Ionicons name="chatbubble" size={20} color={colors.secondary} /><Text style={[styles.cardTitle, { color: colors.secondary }]}>Envíanos un mensaje</Text></View>

            {[
              { key: 'name', label: 'Nombre', placeholder: 'Tu nombre' },
              { key: 'email', label: 'Email', placeholder: 'tu@email.com' },
              { key: 'subject', label: 'Asunto', placeholder: '¿En qué podemos ayudarte?' }
            ].map(i => (
              <View key={i.key} style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.white, fontWeight: '600', marginBottom: 8 }}>{i.label}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.secondary, color: colors.white }]}
                  placeholder={i.placeholder} placeholderTextColor={colors.gray} value={(form as any)[i.key]} onChangeText={v => setField(i.key, v)}
                />
              </View>
            ))}

            <Text style={{ color: colors.white, fontWeight: '600', marginBottom: 8 }}>Mensaje</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.secondary, color: colors.white }]}
              placeholder="Contanos los detalles..." placeholderTextColor={colors.gray}
              multiline numberOfLines={4} textAlignVertical="top" value={form.message} onChangeText={v => setField('message', v)}
            />

            <TouchableOpacity style={[styles.submit, { backgroundColor: colors.accent }]} onPress={onClose}>
              <Text style={{ color: colors.white, fontWeight: 'bold' }}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingTop:30,paddingBottom:20},
  title:{fontSize:24,fontWeight:'bold'}, close:{width:40,height:40,borderRadius:20,backgroundColor:'rgba(255,255,255,0.1)',justifyContent:'center',alignItems:'center'},
  card:{borderRadius:16,borderWidth:1,padding:24,marginBottom:24},
  row:{flexDirection:'row',alignItems:'center',marginBottom:16}, cardTitle:{fontSize:20,fontWeight:'bold',marginLeft:8},
  input:{borderWidth:1,borderRadius:8,paddingHorizontal:16,paddingVertical:12,fontSize:16}, textArea:{borderWidth:1,borderRadius:8,paddingHorizontal:16,paddingVertical:12,fontSize:16,height:100,marginBottom:16},
  submit:{paddingVertical:14,borderRadius:12,alignItems:'center'}
});
