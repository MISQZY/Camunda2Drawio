'use strict';

// Runs in the Electron main process (Camunda Modeler has no API for a
// plugin to inject items into its native File menu / Export As submenu -
// third-party menu contributions only ever land under the top-level
// "Plugins" menu). Each action name must match the editorActions key
// registered in the matching src/plugin/client/Drawio*EditorAction.js.
module.exports = function (electronApp, menuState) {
  return [
    {
      label: 'Export as Draw.io',
      enabled: () => menuState.bpmn,
      action: () => electronApp.emit('menu:action', 'exportDrawio')
    },
    {
      label: 'Import from Draw.io',
      enabled: () => menuState.bpmn,
      action: () => electronApp.emit('menu:action', 'importDrawio')
    }
  ];
};
