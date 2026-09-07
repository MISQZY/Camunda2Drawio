import { convertDrawioToBpmn } from '../../converter/index.js';
import { context } from './exportState.js';

// Same trick export uses in reverse: no Electron/native file dialog IPC is
// involved, just a hidden <input type="file"> + FileReader, both plain
// browser APIs already available in this renderer-side plugin bundle.
function pickDrawioFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.drawio,.xml';
    input.style.display = 'none';

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      document.body.removeChild(input);

      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, content: String(reader.result) });
      reader.onerror = () => reject(reader.error || new Error('Failed to read the selected file.'));
      reader.readAsText(file);
    });

    document.body.appendChild(input);
    input.click();
  });
}

async function importDrawioIntoActiveDiagram() {
  const { modeler, displayNotification } = context;
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
    const file = await pickDrawioFile();
    if (!file) {
      return;
    }

    const bpmnXml = await convertDrawioToBpmn(file.content);
    await modeler.importXML(bpmnXml);

    notify({
      type: 'success',
      title: 'Draw.io',
      content: `Imported ${file.name}`
    });
  } catch (error) {
    notify({
      type: 'error',
      title: 'draw.io Import failed',
      content: error.message
    });
  }
}

export { importDrawioIntoActiveDiagram };
