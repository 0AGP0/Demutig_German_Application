const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    assetExts: ['bin', 'txt', 'jpg', 'png', 'json', 'mp3', 'ttf', 'otf', 'woff', 'woff2', 'pdf'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);


