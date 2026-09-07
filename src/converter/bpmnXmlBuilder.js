const { escapeXml } = require('./xmlBuilder');

// bpmn:UserTask -> bpmn:userTask, bpmn:StartEvent -> bpmn:startEvent, etc. -
// every BPMN element name used here is its type name with a lower-cased
// first letter, so one rule covers all of them.
function tagName(type) {
  const bare = type.slice('bpmn:'.length);
  return `bpmn:${bare.charAt(0).toLowerCase()}${bare.slice(1)}`;
}

function eventDefinitionTagName(eventDefinitionType) {
  return `bpmn:${eventDefinitionType}EventDefinition`;
}

const DEFAULT_FLOW_HOLDER_TYPES = new Set([
  'bpmn:Task',
  'bpmn:UserTask',
  'bpmn:ServiceTask',
  'bpmn:ScriptTask',
  'bpmn:ManualTask',
  'bpmn:BusinessRuleTask',
  'bpmn:SendTask',
  'bpmn:ReceiveTask',
  'bpmn:CallActivity',
  'bpmn:SubProcess',
  'bpmn:ExclusiveGateway',
  'bpmn:ParallelGateway',
  'bpmn:InclusiveGateway',
  'bpmn:ComplexGateway',
  'bpmn:EventBasedGateway'
]);

function renderNode(node) {
  const tag = tagName(node.type);
  const attrs = [`id="${escapeXml(node.id)}"`];
  if (node.name) {
    attrs.push(`name="${escapeXml(node.name)}"`);
  }
  if (node.type === 'bpmn:BoundaryEvent') {
    if (node.attachedToId) {
      attrs.push(`attachedToRef="${escapeXml(node.attachedToId)}"`);
    }
    if (node.isInterrupting === false) {
      attrs.push('cancelActivity="false"');
    }
  }
  if (DEFAULT_FLOW_HOLDER_TYPES.has(node.type) && node.defaultFlowId) {
    attrs.push(`default="${escapeXml(node.defaultFlowId)}"`);
  }

  const body = [];
  if (node.type === 'bpmn:TextAnnotation') {
    body.push(`<bpmn:text>${escapeXml(node.name || '')}</bpmn:text>`);
  }
  // The actual condition/expression body isn't recoverable from a drawio
  // cell (styleMap.js only ever encoded *whether* a flow had one, as an
  // arrow marker) - so this only restores the marker-triggering element,
  // not its original expression text.
  if (node.eventDefinitionType) {
    body.push(`<${eventDefinitionTagName(node.eventDefinitionType)} id="${escapeXml(node.id)}_eventDef" />`);
  }
  if (node.type === 'bpmn:SubProcess' && node.children) {
    node.children.forEach((child) => body.push(renderFlowElement(child)));
  }

  if (body.length === 0) {
    return `<${tag} ${attrs.join(' ')} />`;
  }
  return `<${tag} ${attrs.join(' ')}>${body.join('')}</${tag}>`;
}

function renderEdge(edge) {
  const tag = tagName(edge.type);
  const attrs = [`id="${escapeXml(edge.id)}"`];
  if (edge.name) {
    attrs.push(`name="${escapeXml(edge.name)}"`);
  }
  if (edge.sourceId) {
    attrs.push(`sourceRef="${escapeXml(edge.sourceId)}"`);
  }
  if (edge.targetId) {
    attrs.push(`targetRef="${escapeXml(edge.targetId)}"`);
  }
  if (edge.type === 'bpmn:Association' && edge.associationDirection) {
    attrs.push(`associationDirection="${escapeXml(edge.associationDirection)}"`);
  }

  if (edge.type === 'bpmn:SequenceFlow' && edge.hasCondition) {
    return [
      `<${tag} ${attrs.join(' ')}>`,
      '<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" />',
      `</${tag}>`
    ].join('');
  }

  return `<${tag} ${attrs.join(' ')} />`;
}

function renderFlowElement(element) {
  return element.kind === 'edge' ? renderEdge(element) : renderNode(element);
}

function renderLaneSets(process) {
  return [...process.laneSets.values()]
    .map((laneSet) => {
      const lanesXml = laneSet.lanes
        .map((lane) => {
          const nameAttr = lane.name ? ` name="${escapeXml(lane.name)}"` : '';
          const refsXml = lane.flowNodeRefs.map((ref) => `<bpmn:flowNodeRef>${escapeXml(ref)}</bpmn:flowNodeRef>`).join('');
          return `<bpmn:lane id="${escapeXml(lane.id)}"${nameAttr}>${refsXml}</bpmn:lane>`;
        })
        .join('');
      return `<bpmn:laneSet id="${escapeXml(laneSet.id)}">${lanesXml}</bpmn:laneSet>`;
    })
    .join('');
}

function renderProcess(process) {
  const laneSetsXml = renderLaneSets(process);
  const flowElementsXml = process.flowElements.map(renderFlowElement).join('');
  return `<bpmn:process id="${escapeXml(process.id)}" isExecutable="false">${laneSetsXml}${flowElementsXml}</bpmn:process>`;
}

function renderCollaboration(collaboration) {
  const participantsXml = collaboration.participants
    .map((participant) => {
      const nameAttr = participant.name ? ` name="${escapeXml(participant.name)}"` : '';
      return `<bpmn:participant id="${escapeXml(participant.id)}"${nameAttr} processRef="${escapeXml(participant.processId)}" />`;
    })
    .join('');
  const messageFlowsXml = collaboration.messageFlows.map(renderEdge).join('');
  const artifactsXml = collaboration.artifacts.map(renderFlowElement).join('');
  return `<bpmn:collaboration id="${escapeXml(collaboration.id)}">${participantsXml}${messageFlowsXml}${artifactsXml}</bpmn:collaboration>`;
}

function renderShape(node) {
  const bounds = node.absoluteBounds || { x: node.x, y: node.y, width: node.width, height: node.height };
  const attrs = [`id="${escapeXml(node.id)}_di"`, `bpmnElement="${escapeXml(node.id)}"`];
  if (node.type === 'bpmn:Participant' || node.type === 'bpmn:Lane') {
    attrs.push('isHorizontal="true"');
  }
  if (node.type === 'bpmn:SubProcess' && node.isExpanded === false) {
    attrs.push('isExpanded="false"');
  }
  return [
    `<bpmndi:BPMNShape ${attrs.join(' ')}>`,
    `<dc:Bounds x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" />`,
    '</bpmndi:BPMNShape>'
  ].join('');
}

function renderEdgeDi(edge) {
  const waypointsXml = (edge.waypoints || []).map((point) => `<di:waypoint x="${point.x}" y="${point.y}" />`).join('');
  return [`<bpmndi:BPMNEdge id="${escapeXml(edge.id)}_di" bpmnElement="${escapeXml(edge.id)}">`, waypointsXml, '</bpmndi:BPMNEdge>'].join('');
}

function buildBpmnXml({ collaboration, processes, nodes, edges }) {
  const rootBpmnElementId = collaboration ? collaboration.id : processes[0].id;

  const collaborationXml = collaboration ? renderCollaboration(collaboration) : '';
  const processesXml = processes.map(renderProcess).join('');
  const shapesXml = [...nodes.values()].map(renderShape).join('');
  const edgesXml = edges.map(renderEdgeDi).join('');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">',
    collaborationXml,
    processesXml,
    '<bpmndi:BPMNDiagram id="BPMNDiagram_1">',
    `<bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${escapeXml(rootBpmnElementId)}">`,
    shapesXml,
    edgesXml,
    '</bpmndi:BPMNPlane>',
    '</bpmndi:BPMNDiagram>',
    '</bpmn:definitions>'
  ]
    .filter((line) => line !== '')
    .join('\n');
}

module.exports = { buildBpmnXml };
