import { useEffect } from 'react';
import { View, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

// Permite que expo-auth-session complete el flujo en la web y cierre la pestaña cuando corresponde.
WebBrowser.maybeCompleteAuthSession();

export default function OAuthCallback() {
  useEffect(() => {
    // Intenta cerrar la ventana emergente (si el navegador lo permite)
    const timer = setTimeout(() => {
      try {
        window.close();
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 16, textAlign: 'center' }}>
        Volviendo a PlayVerse… ya podés cerrar esta pestaña.
      </Text>
    </View>
  );
}
