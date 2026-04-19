const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude folders that cause re-bundle loops
config.watchFolders = [];
config.resolver.blockList = [
  /dist\/.*/,
  /android\/app\/build\/.*/,
  /\.expo\/.*/,
];

module.exports = config;
