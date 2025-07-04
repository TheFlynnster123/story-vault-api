const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    target: 'node',
    entry: {
      // Azure Functions entry points
      'functions/GetNote': './src/functions/GetNote.ts',
      'functions/SaveNote': './src/functions/SaveNote.ts',
      'functions/DeleteNote': './src/functions/DeleteNote.ts',
      'functions/PostChat': './src/functions/PostChat.ts',
      'functions/GetChatHistory': './src/functions/GetChatHistory.ts',
      'functions/GetChatPage': './src/functions/GetChatPage.ts',
      'functions/GetChats': './src/functions/GetChats.ts',
      'functions/HasValidGrokKey': './src/functions/HasValidGrokKey.ts',
      'functions/HelloWorld': './src/functions/HelloWorld.ts',
      'functions/SaveChatPage': './src/functions/SaveChatPage.ts',
      'functions/SaveGrokKey': './src/functions/SaveGrokKey.ts',
    },
    mode: isProduction ? 'production' : 'development',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      libraryTarget: 'commonjs2',
      clean: true,
    },
    externals: {
      // Azure Functions runtime dependencies
      '@azure/functions': '@azure/functions',
      // Azure Storage dependencies
      '@azure/storage-blob': '@azure/storage-blob',
      // Authentication dependencies
      'jsonwebtoken': 'jsonwebtoken',
      'jwks-rsa': 'jwks-rsa',
      // OpenAI dependency
      'openai': 'openai',
    },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: true,
            },
            mangle: {
              keep_fnames: true, // Keep function names for Azure Functions
            },
          },
        }),
      ],
    },
    devtool: isProduction ? false : 'source-map',
    stats: {
      warnings: false,
    },
  };
};
