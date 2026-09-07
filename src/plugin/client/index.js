import { registerClientExtension, registerBpmnJSPlugin } from 'camunda-modeler-plugin-helpers';

import DrawioExportPlugin from './DrawioExportPlugin.js';
import DrawioExportEditorAction from './DrawioExportEditorAction.js';

registerClientExtension(DrawioExportPlugin);
registerBpmnJSPlugin(DrawioExportEditorAction);
