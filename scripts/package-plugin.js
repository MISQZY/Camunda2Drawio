'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PLUGIN_NAME = 'camunda-drawio-export';
const BUNDLE_PATH = path.join(ROOT, 'src', 'plugin', 'client', 'dist', 'client.js');
const OUTPUT_DIR = path.join(ROOT, 'release', PLUGIN_NAME);

function assertBundleExists() {
  if (!fs.existsSync(BUNDLE_PATH)) {
    throw new Error(`Bundle not found at ${BUNDLE_PATH}. Run "npm run build:plugin" first.`);
  }
}

function writeManifest() {
  const manifest = "'use strict';\n\nmodule.exports = {\n  name: 'draw.io Export',\n  script: './client.js'\n};\n";
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.js'), manifest);
}

function packagePlugin() {
  assertBundleExists();

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  writeManifest();
  fs.copyFileSync(BUNDLE_PATH, path.join(OUTPUT_DIR, 'client.js'));

  console.log(`Plugin folder ready at: ${OUTPUT_DIR}`);
  console.log('Copy this folder into your Camunda Modeler plugins directory.');
}

packagePlugin();
