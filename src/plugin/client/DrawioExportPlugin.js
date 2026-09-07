import React, { PureComponent } from 'camunda-modeler-plugin-helpers/react.js';
import Fill from 'camunda-modeler-plugin-helpers/components/Fill.js';

import { convertBpmnToDrawio } from '../../converter/index.js';
import { toExportFileName } from '../exportFileName.js';

const h = React.createElement;

function triggerDownload(fileName, content) {
  const blob = new Blob([content], { type: 'application/xml' });
  const link = document.createElement('a');

  link.download = fileName;
  link.href = URL.createObjectURL(blob);
  link.click();

  URL.revokeObjectURL(link.href);
}

export default class DrawioExportPlugin extends PureComponent {
  constructor(props) {
    super(props);

    this.modeler = null;
    this.tab = null;
  }

  componentDidMount() {
    const { subscribe } = this.props;

    subscribe('bpmn.modeler.created', (event) => {
      this.modeler = event.modeler;
      this.tab = event.tab;
    });
  }

  handleExport = async () => {
    const { displayNotification } = this.props;

    if (!this.modeler) {
      displayNotification({
        type: 'warning',
        title: 'draw.io Export',
        content: 'Open a BPMN diagram first.'
      });
      return;
    }

    try {
      const { xml } = await this.modeler.saveXML({ format: true });
      const drawioXml = await convertBpmnToDrawio(xml);
      const fileName = toExportFileName(this.tab && this.tab.name);

      triggerDownload(fileName, drawioXml);

      displayNotification({
        type: 'success',
        title: 'draw.io Export',
        content: `Exported ${fileName}`
      });
    } catch (error) {
      displayNotification({
        type: 'error',
        title: 'draw.io Export failed',
        content: error.message
      });
    }
  };

  render() {
    return h(
      Fill,
      { slot: 'toolbar', group: '9_optimize' },
      h(
        'button',
        {
          type: 'button',
          title: 'Export as draw.io diagram',
          onClick: this.handleExport
        },
        'draw.io'
      )
    );
  }
}
