import { importDrawioIntoActiveDiagram } from './importState.js';

function ImportDrawioEditorAction(editorActions) {
  editorActions.register({
    importDrawio: importDrawioIntoActiveDiagram
  });
}

ImportDrawioEditorAction.$inject = ['editorActions'];

// Registered as a bpmn-js additional module so the "importDrawio" action
// name can be triggered from the Plugins menu via
// electronApp.emit('menu:action', 'importDrawio') - see src/plugin/menu/menu.js.
export default {
  __init__: ['importDrawioEditorAction'],
  importDrawioEditorAction: ['type', ImportDrawioEditorAction]
};
