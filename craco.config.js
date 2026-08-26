module.exports = {
  babel: {
    presets: [
      [
        '@babel/preset-env',
        {
          modules: false,
          useBuiltIns: false, // ← Esto elimina los polyfills automáticos
          targets: {
            browsers: ['last 2 versions', 'not dead', 'not IE 11', '> 0.5%']
          }
        }
      ]
    ]
  }
};