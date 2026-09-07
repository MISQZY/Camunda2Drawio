const TASK_TYPES = new Set([
  'bpmn:Task',
  'bpmn:UserTask',
  'bpmn:ServiceTask',
  'bpmn:ScriptTask',
  'bpmn:ManualTask',
  'bpmn:BusinessRuleTask',
  'bpmn:SendTask',
  'bpmn:ReceiveTask',
  'bpmn:CallActivity'
]);

const GATEWAY_MARKERS = {
  'bpmn:ExclusiveGateway': 'X',
  'bpmn:ParallelGateway': '+',
  'bpmn:InclusiveGateway': 'O',
  'bpmn:ComplexGateway': '*',
  'bpmn:EventBasedGateway': 'E'
};

function tag(type) {
  return `bpmnElement=${type};`;
}

function resolveTaskStyle(descriptor) {
  return `rounded=1;whiteSpace=wrap;html=1;${tag(descriptor.type)}`;
}

function strokeWidthFor(type) {
  if (type === 'bpmn:EndEvent') {
    return 3;
  }
  return 1;
}

function resolveEventStyle(descriptor) {
  const strokeWidth = strokeWidthFor(descriptor.type);
  let style = `ellipse;whiteSpace=wrap;html=1;strokeWidth=${strokeWidth};${tag(descriptor.type)}`;

  if (descriptor.eventDefinitionType) {
    style += `bpmnEventDefinition=${descriptor.eventDefinitionType};`;
  }
  if (descriptor.type === 'bpmn:BoundaryEvent' && descriptor.isInterrupting === false) {
    style += 'dashed=1;';
  }

  return style;
}

function resolveGatewayStyle(descriptor) {
  const style = `rhombus;whiteSpace=wrap;html=1;perimeterSpacing=6;fillColor=#fff2cc;strokeColor=#d6b656;${tag(descriptor.type)}`;
  return { style, markerGlyph: GATEWAY_MARKERS[descriptor.type] || null };
}

function resolveDataStyle(descriptor) {
  if (descriptor.type === 'bpmn:DataObjectReference') {
    return `shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;size=16;${tag(descriptor.type)}`;
  }
  return `shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=10;${tag(descriptor.type)}`;
}

function resolveContainerStyle(descriptor) {
  if (descriptor.type === 'bpmn:Participant') {
    return `swimlane;horizontal=0;whiteSpace=wrap;html=1;startSize=30;${tag(descriptor.type)}`;
  }
  if (descriptor.type === 'bpmn:Lane') {
    return `swimlane;horizontal=0;whiteSpace=wrap;html=1;startSize=20;${tag(descriptor.type)}`;
  }

  let style = `rounded=1;whiteSpace=wrap;html=1;verticalAlign=top;${tag(descriptor.type)}`;
  if (descriptor.isExpanded === false) {
    style += 'bpmnCollapsed=1;';
  }
  return style;
}

function resolveArtifactStyle(descriptor) {
  if (descriptor.type === 'bpmn:TextAnnotation') {
    return `text;html=1;align=left;verticalAlign=middle;whiteSpace=wrap;spacingLeft=8;${tag(descriptor.type)}`;
  }
  return `rounded=1;dashed=1;whiteSpace=wrap;html=1;fillColor=none;${tag(descriptor.type)}`;
}

function resolveSequenceFlowStyle(descriptor) {
  let style = 'edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;endFill=1;';
  if (descriptor.hasCondition) {
    style += 'startArrow=diamondThin;startFill=0;startSize=14;';
  }
  if (descriptor.isDefault) {
    style += 'bpmnDefaultFlow=1;';
  }
  return style + tag(descriptor.type);
}

function resolveMessageFlowStyle(descriptor) {
  return `edgeStyle=orthogonalEdgeStyle;html=1;dashed=1;startArrow=oval;startFill=0;startSize=8;endArrow=block;endFill=0;${tag(descriptor.type)}`;
}

function resolveAssociationStyle(descriptor) {
  const endArrow = descriptor.associationDirection === 'One' || descriptor.associationDirection === 'Both' ? 'open' : 'none';
  const startArrow = descriptor.associationDirection === 'Both' ? 'open' : 'none';
  return `edgeStyle=orthogonalEdgeStyle;html=1;dashed=1;endArrow=${endArrow};startArrow=${startArrow};${tag(descriptor.type)}`;
}

const EVENT_TYPES = new Set([
  'bpmn:StartEvent',
  'bpmn:EndEvent',
  'bpmn:IntermediateThrowEvent',
  'bpmn:IntermediateCatchEvent',
  'bpmn:BoundaryEvent'
]);

const GATEWAY_TYPES = new Set(Object.keys(GATEWAY_MARKERS));
const DATA_TYPES = new Set(['bpmn:DataObjectReference', 'bpmn:DataStoreReference']);
const CONTAINER_TYPES = new Set(['bpmn:Participant', 'bpmn:Lane', 'bpmn:SubProcess']);
const ARTIFACT_TYPES = new Set(['bpmn:TextAnnotation', 'bpmn:Group']);

function resolveStyle(descriptor) {
  const { type } = descriptor;

  if (type === 'bpmn:SequenceFlow') {
    return { style: resolveSequenceFlowStyle(descriptor), markerGlyph: null };
  }
  if (type === 'bpmn:MessageFlow') {
    return { style: resolveMessageFlowStyle(descriptor), markerGlyph: null };
  }
  if (type === 'bpmn:Association') {
    return { style: resolveAssociationStyle(descriptor), markerGlyph: null };
  }
  if (TASK_TYPES.has(type)) {
    return { style: resolveTaskStyle(descriptor), markerGlyph: null };
  }
  if (EVENT_TYPES.has(type)) {
    return { style: resolveEventStyle(descriptor), markerGlyph: null };
  }
  if (GATEWAY_TYPES.has(type)) {
    return resolveGatewayStyle(descriptor);
  }
  if (DATA_TYPES.has(type)) {
    return { style: resolveDataStyle(descriptor), markerGlyph: null };
  }
  if (CONTAINER_TYPES.has(type)) {
    return { style: resolveContainerStyle(descriptor), markerGlyph: null };
  }
  if (ARTIFACT_TYPES.has(type)) {
    return { style: resolveArtifactStyle(descriptor), markerGlyph: null };
  }

  return { style: `whiteSpace=wrap;html=1;${tag(type)}`, markerGlyph: null };
}

module.exports = { resolveStyle };
