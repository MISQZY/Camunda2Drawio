// Every style below is sourced from draw.io's own "BPMN 2.0" shape library
// (shape search "bpmn" -> "BPMN 2.0 \ General/Tasks/Events/Gateways"; see
// jgraph/drawio's js/diagramly/sidebar/Sidebar-BPMN.js, which ships in every
// draw.io build - nothing here is a separately-installed/optional library).
// Tasks and Sub-Processes use `shape=mxgraph.bpmn.task2`: its own
// `taskMarker` key draws the per-type icon and its own `isLoopSub` key draws
// the collapsed "+" marker, so no hand-drawn child cells are needed. Events
// use `shape=mxgraph.bpmn.event` and Gateways use `shape=mxgraph.bpmn.gateway2`,
// both driven purely by their own `outline`/`symbol`/`gwType` style keys.
// Data objects/stores use `mxgraph.bpmn.data2`/`datastore`, and pools/lanes
// use the plain `swimlane` primitive - the same shape draw.io's own BPMN
// Lane entries use.

const TASK_MARKER = {
  'bpmn:Task': 'abstract',
  'bpmn:UserTask': 'user',
  'bpmn:ServiceTask': 'service',
  'bpmn:ScriptTask': 'script',
  'bpmn:ManualTask': 'manual',
  'bpmn:BusinessRuleTask': 'businessRule',
  'bpmn:SendTask': 'send',
  'bpmn:ReceiveTask': 'receive'
};

const TASK_TYPES = new Set([...Object.keys(TASK_MARKER), 'bpmn:CallActivity']);

const EVENT_TYPES = new Set([
  'bpmn:StartEvent',
  'bpmn:EndEvent',
  'bpmn:IntermediateThrowEvent',
  'bpmn:IntermediateCatchEvent',
  'bpmn:BoundaryEvent'
]);

const GATEWAY_TYPES = new Set([
  'bpmn:ExclusiveGateway',
  'bpmn:ParallelGateway',
  'bpmn:InclusiveGateway',
  'bpmn:ComplexGateway',
  'bpmn:EventBasedGateway'
]);

const DATA_TYPES = new Set(['bpmn:DataObjectReference', 'bpmn:DataStoreReference']);
const CONTAINER_TYPES = new Set(['bpmn:Participant', 'bpmn:Lane']);
const ARTIFACT_TYPES = new Set(['bpmn:TextAnnotation', 'bpmn:Group']);

// The rounded-rectangle outline draw.io's task2 shape expects.
const TASK_POINTS = 'points=[[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];';
const TASK_BASE = `${TASK_POINTS}shape=mxgraph.bpmn.task2;whiteSpace=wrap;rectStyle=rounded;size=10;html=1;container=1;expand=0;collapsible=0;`;

function resolveTaskStyle(descriptor) {
  if (descriptor.type === 'bpmn:CallActivity') {
    return `${TASK_BASE}bpmnShapeType=call;`;
  }
  return `${TASK_BASE}taskMarker=${TASK_MARKER[descriptor.type]};`;
}

function resolveSubProcessStyle(descriptor) {
  if (descriptor.isExpanded === false) {
    return `${TASK_BASE}taskMarker=abstract;isLoopSub=1;`;
  }
  return `${TASK_BASE}taskMarker=abstract;verticalAlign=top;align=left;spacingLeft=5;`;
}

// `outline` values are the ones draw.io's own mxgraph.bpmn.event shape
// understands: standard/end = single thin/thick border, throwing/catching/
// boundInt/boundNonint = double border (solid, or dashed for non-interrupting).
const EVENT_OUTLINE = {
  'bpmn:StartEvent': 'standard',
  'bpmn:EndEvent': 'end',
  'bpmn:IntermediateThrowEvent': 'throwing',
  'bpmn:IntermediateCatchEvent': 'catching'
};

const EVENT_POINTS = 'points=[[0.145,0.145,0],[0.5,0,0],[0.855,0.145,0],[1,0.5,0],[0.855,0.855,0],[0.5,1,0],[0.145,0.855,0],[0,0.5,0]];';
const EVENT_BASE = `${EVENT_POINTS}shape=mxgraph.bpmn.event;html=1;verticalLabelPosition=bottom;labelBackgroundColor=#ffffff;verticalAlign=top;align=center;perimeter=ellipsePerimeter;outlineConnect=0;aspect=fixed;`;

// Maps the `eventDefinitionType` bpmn-moddle exposes (the lower-cased head
// of the `bpmn:XxxEventDefinition` class name - see diagramConverter.js)
// to the `symbol` value the mxgraph.bpmn.event shape understands. Only
// "compensate" needs renaming; every other definition type already matches
// the shape's own symbol name.
const EVENT_SYMBOL = {
  message: 'message',
  timer: 'timer',
  escalation: 'escalation',
  conditional: 'conditional',
  link: 'link',
  error: 'error',
  cancel: 'cancel',
  compensate: 'compensation',
  signal: 'signal',
  terminate: 'terminate'
};

function resolveEventOutline(descriptor) {
  if (descriptor.type === 'bpmn:BoundaryEvent') {
    return descriptor.isInterrupting === false ? 'boundNonint' : 'boundInt';
  }
  return EVENT_OUTLINE[descriptor.type];
}

function resolveEventStyle(descriptor) {
  const outline = resolveEventOutline(descriptor);
  const symbol = EVENT_SYMBOL[descriptor.eventDefinitionType] || 'general';
  return `${EVENT_BASE}outline=${outline};symbol=${symbol};`;
}

// Exclusive/parallel/complex gateways use draw.io's dedicated `gwType`
// marker (mxBpmnShape2.js: paintVertexShape draws the X/+/* glyph whenever
// gwType is exclusive/parallel/complex). Leaving `gwType` unset defaults it
// to 'event' internally, which makes the gateway shape delegate to the same
// outline+symbol vocabulary the event shape uses (mxShapeBpmnEvent.
// strictDrawShape): Inclusive is `outline=end;symbol=general` (a bold single
// circle, no inner glyph). Event-based is `outline=catching;symbol=multiple`
// - `catching` is what actually draws the double circle (mxBpmnShape2.js's
// `outlines.catching` strokes a second inset ellipse; `standard` only draws
// one), and `multiple` draws BPMN's pentagon glyph inside it - together the
// real double-circle-with-pentagon Event-Based Gateway marker.
const GATEWAY_MARKER = {
  'bpmn:ExclusiveGateway': 'outline=none;symbol=none;gwType=exclusive;',
  'bpmn:ParallelGateway': 'outline=none;symbol=none;gwType=parallel;',
  'bpmn:ComplexGateway': 'outline=none;symbol=none;gwType=complex;',
  'bpmn:InclusiveGateway': 'outline=end;symbol=general;',
  'bpmn:EventBasedGateway': 'outline=catching;symbol=multiple;'
};

const GATEWAY_POINTS = 'points=[[0.25,0.25,0],[0.5,0,0],[0.75,0.25,0],[1,0.5,0],[0.75,0.75,0],[0.5,1,0],[0.25,0.75,0],[0,0.5,0]];';
const GATEWAY_BASE = `${GATEWAY_POINTS}shape=mxgraph.bpmn.gateway2;html=1;verticalLabelPosition=bottom;labelBackgroundColor=#ffffff;verticalAlign=top;align=center;perimeter=rhombusPerimeter;outlineConnect=0;`;

function resolveGatewayStyle(descriptor) {
  return `${GATEWAY_BASE}${GATEWAY_MARKER[descriptor.type]}`;
}

function resolveDataStyle(descriptor) {
  if (descriptor.type === 'bpmn:DataObjectReference') {
    return 'shape=mxgraph.bpmn.data2;labelPosition=center;verticalLabelPosition=bottom;align=center;verticalAlign=top;size=15;html=1;';
  }
  return 'shape=datastore;html=1;labelPosition=center;verticalLabelPosition=bottom;align=center;verticalAlign=top;';
}

function resolveContainerStyle(descriptor) {
  if (descriptor.type === 'bpmn:Participant') {
    return 'swimlane;startSize=30;horizontal=0;html=1;whiteSpace=wrap;';
  }
  return 'swimlane;startSize=20;horizontal=0;html=1;whiteSpace=wrap;';
}

// draw.io's flowchart stencil library ships two annotation brackets:
// `annotation_1` draws its "[" spine down the shape's true left edge with
// both ticks spanning the full cell width (stencils/flowchart.xml), while
// `annotation_2` (the one draw.io's own BPMN sidebar entry happens to use)
// puts the bracket in the right half of the cell and an unrelated stub line
// in the left half. `_1` is used here instead because its spine is always
// exactly at the cell's left edge - the same point associations are pinned
// to below - and because the bracket keeps its shape regardless of the
// cell's own width (see ANNOTATION_WIDTH).
const ANNOTATION_WIDTH = 20;

function resolveArtifactStyle(descriptor) {
  if (descriptor.type === 'bpmn:TextAnnotation') {
    return 'html=1;shape=mxgraph.flowchart.annotation_1;align=left;labelPosition=right;';
  }
  return 'points=[[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],[0.25,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];rounded=1;arcSize=10;dashed=1;fillColor=none;gradientColor=none;dashPattern=8 3 1 3;strokeWidth=2;whiteSpace=wrap;html=1;';
}

function resolveSequenceFlowStyle(descriptor) {
  let style = 'edgeStyle=elbowEdgeStyle;fontSize=12;html=1;endArrow=blockThin;endFill=1;';
  if (descriptor.hasCondition) {
    style += 'startArrow=diamondThin;startFill=0;endSize=6;startSize=10;';
  } else if (descriptor.isDefault) {
    style += 'startArrow=dash;startFill=0;endSize=6;startSize=6;';
  }
  return style;
}

function resolveMessageFlowStyle() {
  return 'dashed=1;dashPattern=8 4;endArrow=blockThin;endFill=1;startArrow=oval;startFill=0;endSize=6;startSize=4;html=1;';
}

function resolveAssociationStyle(descriptor) {
  const endArrow = descriptor.associationDirection === 'One' || descriptor.associationDirection === 'Both' ? 'openThin' : 'none';
  const startArrow = descriptor.associationDirection === 'Both' ? 'openThin' : 'none';
  return `edgeStyle=elbowEdgeStyle;fontSize=12;html=1;endFill=0;startFill=0;endSize=6;startSize=6;dashed=1;dashPattern=1 4;endArrow=${endArrow};startArrow=${startArrow};`;
}

function resolveStyle(descriptor) {
  const { type } = descriptor;

  if (type === 'bpmn:SequenceFlow') {
    return { style: resolveSequenceFlowStyle(descriptor), markers: [] };
  }
  if (type === 'bpmn:MessageFlow') {
    return { style: resolveMessageFlowStyle(descriptor), markers: [] };
  }
  if (type === 'bpmn:Association') {
    return { style: resolveAssociationStyle(descriptor), markers: [] };
  }
  if (TASK_TYPES.has(type)) {
    return { style: resolveTaskStyle(descriptor), markers: [] };
  }
  if (type === 'bpmn:SubProcess') {
    return { style: resolveSubProcessStyle(descriptor), markers: [] };
  }
  if (EVENT_TYPES.has(type)) {
    return { style: resolveEventStyle(descriptor), markers: [] };
  }
  if (GATEWAY_TYPES.has(type)) {
    return { style: resolveGatewayStyle(descriptor), markers: [] };
  }
  if (DATA_TYPES.has(type)) {
    return { style: resolveDataStyle(descriptor), markers: [] };
  }
  if (CONTAINER_TYPES.has(type)) {
    return { style: resolveContainerStyle(descriptor), markers: [] };
  }
  if (ARTIFACT_TYPES.has(type)) {
    return { style: resolveArtifactStyle(descriptor), markers: [] };
  }

  return { style: 'whiteSpace=wrap;html=1;', markers: [] };
}

// The BPMN source's own annotation bounds are sized to fit the text inside
// the box (that's how bpmn-js/Camunda Modeler draw it), but draw.io's
// bracket shape puts the label outside, to the right - reusing that width
// for the cell stretches the bracket's ticks out to the label's width
// instead of the source diagram's original spine height, turning it into a
// flat, barely-recognizable rectangle. Overriding just the width keeps the
// bracket's own proportions sane while the label still renders at whatever
// length its text needs.
function resolveGeometry(descriptor) {
  if (descriptor.type === 'bpmn:TextAnnotation') {
    return { width: ANNOTATION_WIDTH };
  }
  return null;
}

module.exports = { resolveStyle, resolveGeometry };
