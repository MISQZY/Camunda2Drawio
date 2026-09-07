'use strict';

// Lets Camunda Modeler load this whole repository folder as a plugin
// directly (script/menu paths below are relative to this file), so a
// GitHub "Download ZIP" needs no build step - see README "Quick start".
module.exports = {
  name: 'Draw.io',
  script: './src/plugin/client/dist/client.js',
  menu: './src/plugin/menu/menu.js'
};
