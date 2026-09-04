module.exports = {
  babel: {
    presets: [
      [
        '@babel/preset-env',
        {
          modules: false,
          useBuiltIns: false,
          targets: {
            browsers: ['last 2 versions', 'not dead', 'not IE 11', '> 0.5%']
          }
        }
      ]
    ]
  },
  webpack: {
    configure: (webpackConfig) => {
      // Eliminar ESLintPlugin de Webpack
      webpackConfig.plugins = webpackConfig.plugins.filter(
        (plugin) => plugin.constructor.name !== 'ESLintWebpackPlugin'
      );
      return webpackConfig;
    },
  },
  devServer: {
    client: {
      overlay: {
        errors: false,
        warnings: false,
        runtimeErrors: false,
      },
    },
  },
};