import { exportActiveDiagramAsDrawio } from './exportState.js';

function ExportDrawioEditorAction(editorActions) {
  editorActions.register({
    exportDrawio: exportActiveDiagramAsDrawio
  });
}

ExportDrawioEditorAction.$inject = ['editorActions'];

// Registered as a bpmn-js additional module so the "exportDrawio" action name
// can be triggered from the Plugins menu via
// electronApp.emit('menu:action', 'exportDrawio') - see src/plugin/menu/menu.js.
export default {
  __init__: ['exportDrawioEditorAction'],
  exportDrawioEditorAction: ['type', ExportDrawioEditorAction]
};
