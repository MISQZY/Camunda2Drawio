const path = require('path');

module.exports = {
  mode: 'production',
  context: __dirname,
  entry: './client/index.js',
  output: {
    path: path.resolve(__dirname, 'client/dist'),
    filename: 'client.js'
  },
  resolve: {
    // prefer the same CJS build Node/Jest resolve, so bpmn-moddle's export
    // shape doesn't differ between the test environment and this bundle
    mainFields: ['main', 'module']
  },
  devtool: 'cheap-module-source-map'
};
