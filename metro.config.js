// Configuración de Metro (el empaquetador de Expo).
// Solo agrega soporte para el archivo .wasm que usa expo-sqlite en la versión web, que sirve para
// revisar pantallas en el navegador. En el celular no cambia nada.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');

module.exports = config;
