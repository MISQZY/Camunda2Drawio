const BpmnModdle = require('bpmn-moddle');
const { buildDescriptors } = require('./diagramConverter');
const { convertElement } = require('./elementConverter');
const { convertFlow } = require('./edgeConverter');
const { buildDrawioXml } = require('./xmlBuilder');

function defaultDiagramName(definitions) {
  const collaboration = (definitions.rootElements || []).find((el) => el.$type === 'bpmn:Collaboration');
  const participant = collaboration && (collaboration.participants || [])[0];
  if (participant && participant.name) {
    return participant.name;
  }
  const process = (definitions.rootElements || []).find((el) => el.$type === 'bpmn:Process');
  if (process && process.name) {
    return process.name;
  }
  return undefined;
}

async function convertBpmnToDrawio(bpmnXml, options = {}) {
  const moddle = new BpmnModdle();
  const { rootElement: definitions } = await moddle.fromXML(bpmnXml);

  const { nodes, flows } = buildDescriptors(definitions);

  const cells = [];
  nodes.forEach((node) => cells.push(...convertElement(node)));
  flows.forEach((flow) => cells.push(...convertFlow(flow)));

  const diagramName = options.diagramName || defaultDiagramName(definitions) || 'Page-1';

  return buildDrawioXml(cells, { diagramName });
}

module.exports = { convertBpmnToDrawio };
