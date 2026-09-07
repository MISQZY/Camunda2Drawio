const { resolveStyle } = require('../../src/converter/styleMap');

describe('resolveStyle for tasks', () => {
  it('renders a generic task using the preconfigured draw.io BPMN 2.0 task shape with no marker', () => {
    const { style, markers } = resolveStyle({ type: 'bpmn:Task' });

    expect(style).toContain('shape=mxgraph.bpmn.task2;');
    expect(style).toContain('taskMarker=abstract;');
    expect(markers).toEqual([]);
  });

  it.each([
    ['bpmn:UserTask', 'user'],
    ['bpmn:ServiceTask', 'service'],
    ['bpmn:ScriptTask', 'script'],
    ['bpmn:ManualTask', 'manual'],
    ['bpmn:BusinessRuleTask', 'businessRule'],
    ['bpmn:SendTask', 'send'],
    ['bpmn:ReceiveTask', 'receive']
  ])('renders %s using the preconfigured task shape with its own taskMarker=%s', (type, marker) => {
    const { style } = resolveStyle({ type });

    expect(style).toContain('shape=mxgraph.bpmn.task2;');
    expect(style).toContain(`taskMarker=${marker};`);
  });

  it('renders a call activity using the preconfigured task shape with bpmnShapeType=call, no manual border hack', () => {
    const { style } = resolveStyle({ type: 'bpmn:CallActivity' });

    expect(style).toContain('shape=mxgraph.bpmn.task2;');
    expect(style).toContain('bpmnShapeType=call;');
    expect(style).not.toContain('strokeWidth=3;');
  });
});

describe('resolveStyle for events', () => {
  it('renders a start event using the preconfigured draw.io BPMN event shape with a single thin border', () => {
    const { style, markers } = resolveStyle({ type: 'bpmn:StartEvent' });

    expect(style).toContain('shape=mxgraph.bpmn.event;');
    expect(style).toContain('outline=standard;');
    expect(style).toContain('symbol=general;');
    expect(markers).toEqual([]);
  });

  it('renders an end event using the preconfigured shape with a single thick border', () => {
    const { style, markers } = resolveStyle({ type: 'bpmn:EndEvent' });

    expect(style).toContain('outline=end;');
    expect(markers).toEqual([]);
  });

  it('renders an intermediate throw event using the preconfigured shape with a double border', () => {
    const { style, markers } = resolveStyle({ type: 'bpmn:IntermediateThrowEvent' });

    expect(style).toContain('outline=throwing;');
    expect(markers).toEqual([]);
  });

  it('renders an intermediate catch event using the preconfigured shape with a double border', () => {
    const { style, markers } = resolveStyle({ type: 'bpmn:IntermediateCatchEvent' });

    expect(style).toContain('outline=catching;');
    expect(markers).toEqual([]);
  });

  it('renders an interrupting boundary event using the preconfigured shape with a solid double border', () => {
    const { style, markers } = resolveStyle({ type: 'bpmn:BoundaryEvent', isInterrupting: true });

    expect(style).toContain('outline=boundInt;');
    expect(markers).toEqual([]);
  });

  it('renders a non-interrupting boundary event using the preconfigured shape with a dashed double border', () => {
    const { style, markers } = resolveStyle({ type: 'bpmn:BoundaryEvent', isInterrupting: false });

    expect(style).toContain('outline=boundNonint;');
    expect(markers).toEqual([]);
  });

  it('defaults to the blank "general" symbol when the event declares no event definition', () => {
    const { style } = resolveStyle({ type: 'bpmn:StartEvent' });

    expect(style).toContain('symbol=general;');
  });

  it.each([
    ['message', 'message'],
    ['timer', 'timer'],
    ['escalation', 'escalation'],
    ['conditional', 'conditional'],
    ['link', 'link'],
    ['error', 'error'],
    ['cancel', 'cancel'],
    ['compensate', 'compensation'],
    ['signal', 'signal'],
    ['terminate', 'terminate']
  ])('renders the %s event definition using the shape\'s own symbol=%s', (eventDefinitionType, symbol) => {
    const { style } = resolveStyle({ type: 'bpmn:IntermediateCatchEvent', eventDefinitionType });

    expect(style).toContain(`symbol=${symbol};`);
  });
});

describe('resolveStyle for gateways', () => {
  it('renders an exclusive gateway using the preconfigured draw.io BPMN gateway shape with its gwType marker', () => {
    const { style, markers } = resolveStyle({ type: 'bpmn:ExclusiveGateway' });

    expect(style).toContain('shape=mxgraph.bpmn.gateway2;');
    expect(style).toContain('gwType=exclusive;');
    expect(markers).toEqual([]);
  });

  it('renders a parallel gateway using the preconfigured shape with gwType=parallel', () => {
    const { style, markers } = resolveStyle({ type: 'bpmn:ParallelGateway' });

    expect(style).toContain('gwType=parallel;');
    expect(markers).toEqual([]);
  });

  it('renders a complex gateway using the preconfigured shape with gwType=complex', () => {
    const { style, markers } = resolveStyle({ type: 'bpmn:ComplexGateway' });

    expect(style).toContain('gwType=complex;');
    expect(markers).toEqual([]);
  });

  it('renders an inclusive gateway using the preconfigured shape with a thick circle marker', () => {
    const { style, markers } = resolveStyle({ type: 'bpmn:InclusiveGateway' });

    expect(style).toContain('outline=end;');
    expect(style).toContain('symbol=general;');
    expect(markers).toEqual([]);
  });

  it('renders an event-based gateway using the preconfigured shape with a double circle and pentagon marker', () => {
    const { style, markers } = resolveStyle({ type: 'bpmn:EventBasedGateway' });

    expect(style).toContain('outline=catching;');
    expect(style).toContain('symbol=multiple;');
    expect(markers).toEqual([]);
  });
});

describe('resolveStyle for containers, data and artifacts', () => {
  it('renders a data object reference using the preconfigured draw.io BPMN data2 shape', () => {
    const { style } = resolveStyle({ type: 'bpmn:DataObjectReference' });

    expect(style).toContain('shape=mxgraph.bpmn.data2;');
    expect(style).toContain('html=1;');
  });

  it('renders a data store reference using the preconfigured draw.io BPMN datastore shape', () => {
    const { style } = resolveStyle({ type: 'bpmn:DataStoreReference' });

    expect(style).toContain('shape=datastore;');
  });

  it('renders a participant pool as a vertical swimlane with a taller header', () => {
    const { style } = resolveStyle({ type: 'bpmn:Participant' });

    expect(style).toContain('swimlane;');
    expect(style).toContain('horizontal=0;');
    expect(style).toContain('startSize=30;');
  });

  it('renders a lane as a vertical swimlane with a smaller header', () => {
    const { style } = resolveStyle({ type: 'bpmn:Lane' });

    expect(style).toContain('swimlane;');
    expect(style).toContain('startSize=20;');
  });

  it('renders an expanded sub-process using the preconfigured task shape as a container, with no marker', () => {
    const { style } = resolveStyle({ type: 'bpmn:SubProcess', isExpanded: true });

    expect(style).toContain('shape=mxgraph.bpmn.task2;');
    expect(style).toContain('container=1;');
    expect(style).not.toContain('isLoopSub=1;');
  });

  it('renders a collapsed sub-process using the preconfigured task shape\'s own isLoopSub "+" marker', () => {
    const { style } = resolveStyle({ type: 'bpmn:SubProcess', isExpanded: false });

    expect(style).toContain('shape=mxgraph.bpmn.task2;');
    expect(style).toContain('isLoopSub=1;');
  });

  it('renders a text annotation using the preconfigured draw.io BPMN annotation bracket shape', () => {
    const { style } = resolveStyle({ type: 'bpmn:TextAnnotation' });

    expect(style).toBe('html=1;shape=mxgraph.flowchart.annotation_1;align=left;labelPosition=right;');
  });

  it('renders a group using the preconfigured draw.io BPMN dashed rounded-octagon style', () => {
    const { style } = resolveStyle({ type: 'bpmn:Group' });

    expect(style).toContain('dashed=1;');
    expect(style).toContain('fillColor=none;');
  });

  it('falls back to a plain rectangle for an unknown type', () => {
    const { style } = resolveStyle({ type: 'bpmn:SomethingUnknown' });

    expect(style).toBe('whiteSpace=wrap;html=1;');
  });
});

describe('resolveStyle for flows', () => {
  it('renders a plain sequence flow using the preconfigured BPMN 2.0 sequence flow style', () => {
    const { style } = resolveStyle({ type: 'bpmn:SequenceFlow' });

    expect(style).toContain('edgeStyle=elbowEdgeStyle;');
    expect(style).toContain('endArrow=blockThin;endFill=1;');
  });

  it('adds a diamond start marker for a conditional sequence flow', () => {
    const { style } = resolveStyle({ type: 'bpmn:SequenceFlow', hasCondition: true });

    expect(style).toContain('startArrow=diamondThin;startFill=0;');
  });

  it('adds a dash start marker for a default sequence flow', () => {
    const { style } = resolveStyle({ type: 'bpmn:SequenceFlow', isDefault: true });

    expect(style).toContain('startArrow=dash;startFill=0;');
  });

  it('renders a dashed circle-to-arrow message flow using the preconfigured BPMN 2.0 message flow style', () => {
    const { style } = resolveStyle({ type: 'bpmn:MessageFlow' });

    expect(style).toContain('dashed=1;');
    expect(style).toContain('startArrow=oval;startFill=0;');
    expect(style).toContain('endArrow=blockThin;endFill=1;');
  });

  it('renders a dotted association with no arrowheads by default', () => {
    const { style } = resolveStyle({ type: 'bpmn:Association' });

    expect(style).toContain('dashed=1;');
    expect(style).toContain('endArrow=none;');
    expect(style).toContain('startArrow=none;');
  });

  it('renders a directed association with an open arrowhead at the target', () => {
    const { style } = resolveStyle({ type: 'bpmn:Association', associationDirection: 'One' });

    expect(style).toContain('endArrow=openThin;');
    expect(style).toContain('startArrow=none;');
  });

  it('renders a bi-directional association with open arrowheads at both ends', () => {
    const { style } = resolveStyle({ type: 'bpmn:Association', associationDirection: 'Both' });

    expect(style).toContain('endArrow=openThin;');
    expect(style).toContain('startArrow=openThin;');
  });
});
