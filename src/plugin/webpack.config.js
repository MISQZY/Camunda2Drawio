const path = require('path');

module.exports = {
  mode: 'production',
  context: __dirname,
  entry: './client/index.js',
  output: {
    path: path.resolve(__dirname, 'client/dist'),
    filename: 'client.js'
  },
  devtool: 'cheap-module-source-map'
};
