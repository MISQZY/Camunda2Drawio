import { convertBpmnToDrawio } from '../../converter/index.js';
import { toExportFileName } from '../exportFileName.js';

function triggerDownload(fileName, content) {
  const blob = new Blob([content], { type: 'application/xml' });
  const link = document.createElement('a');

  link.download = fileName;
  link.href = URL.createObjectURL(blob);
  link.click();

  URL.revokeObjectURL(link.href);
}

// Shared across the React client extension (which tracks the active modeler
// and tab) and the bpmn-js editor action (which the "Export as draw.io
// diagram" menu item triggers) - both live in the same bundled module scope.
const context = {
  modeler: null,
  tab: null,
  displayNotification: null
};

async function exportActiveDiagramAsDrawio() {
  const { modeler, tab, displayNotification } = context;
  const notify = displayNotification || (() => {});

  if (!modeler) {
    notify({
      type: 'warning',
      title: 'Draw.io',
      content: 'Open a BPMN diagram first.'
    });
    return;
  }

  try {
    const { xml } = await modeler.saveXML({ format: true });
    const drawioXml = await convertBpmnToDrawio(xml);
    const fileName = toExportFileName(tab && tab.name);

    triggerDownload(fileName, drawioXml);

    notify({
      type: 'success',
      title: 'Draw.io',
      content: `Exported ${fileName}`
    });
  } catch (error) {
    notify({
      type: 'error',
      title: 'draw.io Export failed',
      content: error.message
    });
  }
}

export { context, exportActiveDiagramAsDrawio };
