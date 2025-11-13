const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules ?? {}),
    'react-native-gesture-handler': path.resolve(
      __dirname,
      'node_modules/react-native-gesture-handler'
    ),
  },
};

module.exports = withNativeWind(config, { input: './global.css' });

