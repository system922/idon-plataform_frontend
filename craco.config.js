module.exports = {
  babel: {
    presets: [
      [
        '@babel/preset-env',
        {
          modules: false,
          useBuiltIns: 'usage', 
          corejs: 3, 
          targets: {
            browsers: ['last 2 versions', 'not dead', 'not IE 11', '> 0.5%']
          }
        }
      ]
    ]
  }
};