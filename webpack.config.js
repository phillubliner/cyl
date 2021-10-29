const path = require('path');

module.exports = {
  entry: './src/cyl.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
	module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
	},
	devServer: {
		hot: true,
    compress: false,
    port: 8000,
		writeToDisk: true
	},
  resolve: {
    fallback: {
      "zlib": false,
      "path": false,
      "buffer": false
    }
  }
};