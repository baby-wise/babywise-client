module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module:react-native-dotenv', {
      moduleName: '@env',
      path: '.env',  // Este es el archivo que se carga por defecto
      blacklist: null,
      whitelist: null,
      safe: false,
      allowUndefined: true
    }]
  ]
};
