const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Le decimos a Metro dónde buscar tslib
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  tslib: path.resolve(__dirname, 'node_modules/tslib/tslib.js')
};

module.exports = config;
