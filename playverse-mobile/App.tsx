import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './src/App';
import './global.css';

// Expo necesita que registremos el componente raíz
registerRootComponent(App);
