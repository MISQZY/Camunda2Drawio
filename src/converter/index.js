const BpmnModdleModule = require('bpmn-moddle');
// Node/Jest resolve the CJS build (module.exports = constructor); webpack's
// browser bundle resolves the ESM build (export default), which require()
// sees as { default: constructor } under CJS interop.
const BpmnModdle = typeof BpmnModdleModule === 'function' ? BpmnModdleModule : BpmnModdleModule.default;
const { buildDescriptors } = require('./diagramConverter');
const { convertElement } = require('./elementConverter');
const { convertFlow } = require('./edgeConverter');
const { buildDrawioXml } = require('./xmlBuilder');
const { buildDrawioModel } = require('./drawioToBpmnModel');
const { assembleBpmnModel } = require('./bpmnAssembler');
const { buildBpmnXml } = require('./bpmnXmlBuilder');
const { resolveDrawioGraphXml } = require('./drawioDocument');

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

async function convertDrawioToBpmn(drawioFile) {
  const drawioXml = await resolveDrawioGraphXml(drawioFile);
  const { nodes, edges } = buildDrawioModel(drawioXml);
  const { collaboration, processes } = assembleBpmnModel(nodes, edges);
  const bpmnXml = buildBpmnXml({ collaboration, processes, nodes, edges });

  // Round-trips the freshly built XML through bpmn-moddle so a malformed
  // drawio file surfaces as a rejected promise here, the same way
  // convertBpmnToDrawio surfaces an invalid BPMN file, instead of failing
  // later inside modeler.importXML with no context.
  const moddle = new BpmnModdle();
  await moddle.fromXML(bpmnXml);

  return bpmnXml;
}

module.exports = { convertBpmnToDrawio, convertDrawioToBpmn };
