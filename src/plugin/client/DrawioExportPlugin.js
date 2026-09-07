import { PureComponent } from 'camunda-modeler-plugin-helpers/react.js';

import { context } from './exportState.js';

// No UI: this only keeps `context` (shared with the editor action in
// DrawioExportEditorAction.js) pointed at the currently active modeler/tab.
// The actual "Export as draw.io diagram" entry lives in the Plugins menu
// (see src/plugin/menu/menu.js), not as a button in the status bar.
export default class DrawioExportPlugin extends PureComponent {
  componentDidMount() {
    const { subscribe, displayNotification } = this.props;

    context.displayNotification = displayNotification;

    subscribe('bpmn.modeler.created', (event) => {
      context.modeler = event.modeler;
      context.tab = event.tab;
    });
  }

  render() {
    return null;
  }
}
