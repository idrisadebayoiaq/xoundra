const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const imagePicker = path.join(__dirname, 'node_modules/expo-image-picker/build/ImagePicker.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-image-picker') {
    return { type: 'sourceFile', filePath: imagePicker };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
