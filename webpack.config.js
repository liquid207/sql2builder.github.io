const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  mode: 'development',
  experiments: {
    asyncWebAssembly: true,
    syncWebAssembly: true
  },
  // Defines the entry point of the application
  entry: './src/index.js',

  // Controls how source maps are generated, if at all.
  devtool: 'inline-source-map',

  // Defines the output directory and filenames of bundled resources
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
    clean: true, // Clean the output directory before emit.
  },

  // Configuration for the development server
  devServer: {
    static: './dist',
    open: true, // Open the browser after server had been started
    historyApiFallback: true, // For Single Page Applications
    hot: true, // Enable Hot Module Replacement
  },

  // Defines how different types of modules are treated
  module: {
    rules: [
      // Adds support for JavaScript files
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      // Adds support for CSS files
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      // Adds support for image files
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      // Adds support for fonts and SVGs in CSS
      {
        test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
        type: 'asset/resource',
      },
    ],
  },

  // Enables the use of additional plugins
  plugins: [
    // Generates an HTML file for your bundle
    new HtmlWebpackPlugin({
      title: 'Webpack App',
      template: './src/index.html', // Load a custom template
      inject: true, // Inject all files that are generated by webpack
    }),
    // Cleans the output directory before each build
    new CleanWebpackPlugin(),
  ],

  // Configure how modules are resolved
  resolve: {
    extensions: ['.js', '.jsx'], // Automatically resolve certain extensions
    alias: {
      // Create aliases
      Components: path.resolve(__dirname, 'src/components/'),
      // ... more aliases
    },
  },

  // Optimization configuration
  optimization: {
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 0,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            // Get the name of the npm package
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
            return `npm.${packageName.replace('@', '')}`;
          },
        },
      },
    },
  },
};
