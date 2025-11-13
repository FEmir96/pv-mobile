import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function PlayverseLogo({ size = 'medium', showIcons = true }: { size?: 'small' | 'medium' | 'large'; showIcons?: boolean; }) {
  const cs = useColorScheme(); const colors = Colors[cs ?? 'light'];
  const s = size === 'small' ? { box:24, icon:8, text:16 } : size === 'large' ? { box:40, icon:12, text:24 } : { box:32, icon:10, text:20 };
  return (
    <View style={{ alignItems:'center', justifyContent:'center' }}>
      <View style={[styles.logo, { width: s.box, height: s.box }]}>
        <Text style={{ fontWeight:'bold', fontSize: s.text, color: colors.background, zIndex:2 }}>PV</Text>
        {showIcons && (
          <View style={styles.dec}>
            <Ionicons name="leaf" size={s.icon} color="#10B981" style={{ position:'absolute', top:2, right:2 }} />
            <Ionicons name="game-controller" size={s.icon+2} color={colors.secondary} style={{ position:'absolute', bottom:2, left:2 }} />
          </View>
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  logo:{ backgroundColor:'#FDC700', borderRadius:8, justifyContent:'center', alignItems:'center', position:'relative',
    shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.25, shadowRadius:3.84, elevation:5 },
  dec:{ position:'absolute', top:0, left:0, right:0, bottom:0, justifyContent:'center', alignItems:'center' }
});
