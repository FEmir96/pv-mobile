import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function EditProfileModal({ visible, onClose, currentUsername = 'Eros Bianchini', currentEmail = 'usuario@gmail.com' }: {
  visible: boolean; onClose: () => void; currentUsername?: string; currentEmail?: string;
}) {
  const cs = useColorScheme(); const colors = Colors[cs ?? 'light'];
  const [form, setForm] = useState({ username: currentUsername, currentPassword: '', newPassword: '', confirmPassword: '' });
  const [show, setShow] = useState({ cur: false, n: false, c: false });
  const setField = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = () => {
    if (!form.username.trim()) { Alert.alert('Error', 'El nombre de usuario no puede estar vacío'); return; }
    if (form.newPassword || form.confirmPassword || form.currentPassword) {
      if (!form.currentPassword) return Alert.alert('Error', 'Debes ingresar tu contraseña actual');
      if (!form.newPassword) return Alert.alert('Error', 'Debes ingresar una nueva contraseña');
      if (form.newPassword !== form.confirmPassword) return Alert.alert('Error', 'Las contraseñas no coinciden');
      if (form.newPassword.length < 6) return Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
    }
    Alert.alert('Éxito', 'Perfil actualizado correctamente', [{ text: 'OK', onPress: onClose }]);
  };

  const resetClose = () => { setForm({ username: currentUsername, currentPassword: '', newPassword: '', confirmPassword: '' }); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetClose}>
      <View style={{ flex:1, backgroundColor: colors.background }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.secondary }]}>EDITAR PERFIL</Text>
          <TouchableOpacity style={styles.close} onPress={resetClose}><Ionicons name="close" size={24} color={colors.white} /></TouchableOpacity>
        </View>

        <ScrollView style={{ paddingHorizontal:20 }} showsVerticalScrollIndicator={false}>
          <Text style={{ color: colors.white, textAlign:'center', marginBottom: 24, opacity: 0.9 }}>Actualiza tu información personal</Text>

          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.secondary }]}>
            <View style={styles.row}><Ionicons name="person" size={20} color={colors.secondary} /><Text style={[styles.cardTitle, { color: colors.secondary }]}>Información personal</Text></View>

            <View style={styles.group}>
              <Text style={[styles.label, { color: colors.white }]}>Nombre de usuario</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.secondary, color: colors.white }]} placeholder="Tu nombre gamer" placeholderTextColor={colors.gray} value={form.username} onChangeText={v => setField('username', v)} />
            </View>

            <View style={styles.group}>
              <Text style={[styles.label, { color: colors.white }]}>Email</Text>
              <View style={[styles.input, styles.readOnly, { backgroundColor: colors.background, borderColor: colors.gray }]}><Text style={{ color: colors.gray }}>{currentEmail}</Text><Ionicons name="lock-closed" size={16} color={colors.gray} /></View>
              <Text style={{ color: colors.gray, fontSize:12, marginTop:4, fontStyle:'italic' }}>El email no se puede cambiar por ahora</Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.accent }]}>
            <View style={styles.row}><Ionicons name="lock-closed" size={20} color={colors.accent} /><Text style={[styles.cardTitle, { color: colors.accent }]}>Cambiar contraseña</Text></View>
            <Text style={{ color: colors.white, fontSize: 12, opacity: 0.8, marginBottom: 12, fontStyle: 'italic' }}>Deja vacíos si no querés cambiarla</Text>

            {[
              { key: 'currentPassword', label: 'Contraseña actual', vis: 'cur' as const },
              { key: 'newPassword', label: 'Nueva contraseña', vis: 'n' as const },
              { key: 'confirmPassword', label: 'Confirmar nueva contraseña', vis: 'c' as const }
            ].map(i => (
              <View key={i.key} style={styles.group}>
                <Text style={[styles.label, { color: colors.white }]}>{i.label}</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.accent, color: colors.white, paddingRight: 50 }]}
                    placeholder={i.label} placeholderTextColor={colors.gray} value={(form as any)[i.key]} onChangeText={v => setField(i.key, v)}
                    secureTextEntry={!show[i.vis]}
                  />
                  <TouchableOpacity style={styles.eye} onPress={() => setShow(s => ({ ...s, [i.vis]: !s[i.vis] }))}><Ionicons name={show[i.vis] ? 'eye-off' : 'eye'} size={20} color={colors.gray} /></TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btnCancel, { borderColor: colors.gray }]} onPress={resetClose}><Text style={{ color: colors.gray, fontWeight: 'bold' }}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btnSave, { backgroundColor: colors.secondary }]} onPress={save}><Ionicons name="checkmark" size={20} color={colors.background} /><Text style={{ color: colors.background, fontWeight: 'bold', marginLeft: 8 }}>Guardar</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingTop:30,paddingBottom:20},
  title:{fontSize:24,fontWeight:'bold'}, close:{width:40,height:40,borderRadius:20,backgroundColor:'rgba(255,255,255,0.1)',justifyContent:'center',alignItems:'center'},
  card:{borderRadius:16,borderWidth:1,padding:24,marginBottom:24}, row:{flexDirection:'row',alignItems:'center',marginBottom:16}, cardTitle:{fontSize:20,fontWeight:'bold',marginLeft:8},
  group:{marginBottom:16}, label:{fontSize:16,fontWeight:'600',marginBottom:8}, input:{borderWidth:1,borderRadius:8,paddingHorizontal:16,paddingVertical:12,fontSize:16},
  readOnly:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, eye:{ position:'absolute', right:12, top:0, bottom:0, justifyContent:'center', alignItems:'center', width:40 },
  actions:{flexDirection:'row',gap:12,marginBottom:40}, btnCancel:{flex:1,paddingVertical:14,borderRadius:12,borderWidth:1,alignItems:'center'}, btnSave:{flex:2,flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:14,borderRadius:12}
});
