const { resolveStyle } = require('../../src/converter/styleMap');

describe('resolveStyle', () => {
  it('returns a rounded rectangle for a generic task and tags the bpmn type', () => {
    const { style } = resolveStyle({ type: 'bpmn:Task' });

    expect(style).toContain('rounded=1;whiteSpace=wrap;html=1;');
    expect(style).toContain('bpmnElement=bpmn:Task;');
  });

  it.each([
    ['bpmn:UserTask'],
    ['bpmn:ServiceTask'],
    ['bpmn:ScriptTask'],
    ['bpmn:ManualTask'],
    ['bpmn:BusinessRuleTask'],
    ['bpmn:SendTask'],
    ['bpmn:ReceiveTask']
  ])('renders %s as a rounded rectangle tagged with its own type', (type) => {
    const { style } = resolveStyle({ type });

    expect(style).toContain('rounded=1;whiteSpace=wrap;html=1;');
    expect(style).toContain(`bpmnElement=${type};`);
  });

  it('renders a none start event as a thin-border ellipse', () => {
    const { style } = resolveStyle({ type: 'bpmn:StartEvent' });

    expect(style).toContain('ellipse;whiteSpace=wrap;html=1;');
    expect(style).toContain('strokeWidth=1;');
    expect(style).toContain('fillColor=#d5e8d4;strokeColor=#82b366;');
  });

  it('renders a none end event as a thick-border ellipse', () => {
    const { style } = resolveStyle({ type: 'bpmn:EndEvent' });

    expect(style).toContain('ellipse;whiteSpace=wrap;html=1;');
    expect(style).toContain('strokeWidth=3;');
    expect(style).toContain('fillColor=#f8cecc;strokeColor=#b85450;');
  });

  it('renders an intermediate catch event as a thin ellipse in the intermediate palette', () => {
    const { style } = resolveStyle({ type: 'bpmn:IntermediateCatchEvent' });

    expect(style).toContain('ellipse;whiteSpace=wrap;html=1;');
    expect(style).toContain('strokeWidth=1;');
    expect(style).toContain('fillColor=#ffe6cc;strokeColor=#d79b00;');
  });

  it('tags the event definition type on the style so markers can be derived', () => {
    const { style } = resolveStyle({ type: 'bpmn:StartEvent', eventDefinitionType: 'message' });

    expect(style).toContain('bpmnEventDefinition=message;');
  });

  it('dashes a boundary event that is non-interrupting', () => {
    const { style } = resolveStyle({ type: 'bpmn:BoundaryEvent', isInterrupting: false });

    expect(style).toContain('dashed=1;');
  });

  it('does not dash an interrupting boundary event', () => {
    const { style } = resolveStyle({ type: 'bpmn:BoundaryEvent', isInterrupting: true });

    expect(style).not.toContain('dashed=1;');
  });

  it.each([
    ['bpmn:ExclusiveGateway', 'X'],
    ['bpmn:ParallelGateway', '+'],
    ['bpmn:InclusiveGateway', 'O'],
    ['bpmn:ComplexGateway', '*'],
    ['bpmn:EventBasedGateway', 'E']
  ])('renders %s as a rhombus with marker glyph %s', (type, glyph) => {
    const { style, markerGlyph } = resolveStyle({ type });

    expect(style).toContain('rhombus;whiteSpace=wrap;html=1;');
    expect(style).toContain('fillColor=#fff2cc;strokeColor=#d6b656;');
    expect(markerGlyph).toBe(glyph);
  });

  it('renders a data object reference using the note shape', () => {
    const { style } = resolveStyle({ type: 'bpmn:DataObjectReference' });

    expect(style).toContain('shape=note;');
    expect(style).toContain('whiteSpace=wrap;html=1;');
  });

  it('renders a data store reference using the cylinder shape', () => {
    const { style } = resolveStyle({ type: 'bpmn:DataStoreReference' });

    expect(style).toContain('shape=cylinder3;');
  });

  it('renders a participant pool as a vertical swimlane', () => {
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

  it('renders an expanded sub-process as a rounded rectangle without a collapse marker tag', () => {
    const { style } = resolveStyle({ type: 'bpmn:SubProcess', isExpanded: true });

    expect(style).toContain('rounded=1;whiteSpace=wrap;html=1;');
    expect(style).not.toContain('bpmnCollapsed=1;');
  });

  it('tags a collapsed sub-process so a plus marker can be added', () => {
    const { style } = resolveStyle({ type: 'bpmn:SubProcess', isExpanded: false });

    expect(style).toContain('bpmnCollapsed=1;');
  });

  it('renders a text annotation as an open-bracket text box', () => {
    const { style } = resolveStyle({ type: 'bpmn:TextAnnotation' });

    expect(style).toContain('align=left;');
    expect(style).toContain('verticalAlign=middle;');
  });

  it('renders a group as a dashed borderless rectangle', () => {
    const { style } = resolveStyle({ type: 'bpmn:Group' });

    expect(style).toContain('dashed=1;');
    expect(style).toContain('fillColor=none;');
  });

  it('falls back to a plain rectangle for an unknown type and still tags it', () => {
    const { style } = resolveStyle({ type: 'bpmn:SomethingUnknown' });

    expect(style).toContain('whiteSpace=wrap;html=1;');
    expect(style).toContain('bpmnElement=bpmn:SomethingUnknown;');
  });
});

describe('resolveStyle for flows', () => {
  it('renders a plain sequence flow with a solid arrow', () => {
    const { style } = resolveStyle({ type: 'bpmn:SequenceFlow' });

    expect(style).toContain('edgeStyle=orthogonalEdgeStyle;');
    expect(style).toContain('endArrow=block;endFill=1;');
  });

  it('adds a diamond start marker for a conditional sequence flow', () => {
    const { style } = resolveStyle({ type: 'bpmn:SequenceFlow', hasCondition: true });

    expect(style).toContain('startArrow=diamondThin;startFill=0;');
  });

  it('tags a default sequence flow', () => {
    const { style } = resolveStyle({ type: 'bpmn:SequenceFlow', isDefault: true });

    expect(style).toContain('bpmnDefaultFlow=1;');
  });

  it('renders a dashed circle-to-arrow message flow', () => {
    const { style } = resolveStyle({ type: 'bpmn:MessageFlow' });

    expect(style).toContain('dashed=1;');
    expect(style).toContain('startArrow=oval;startFill=0;');
    expect(style).toContain('endArrow=block;endFill=0;');
  });

  it('renders a dotted association with no arrowheads', () => {
    const { style } = resolveStyle({ type: 'bpmn:Association' });

    expect(style).toContain('dashed=1;');
    expect(style).toContain('endArrow=none;');
    expect(style).toContain('startArrow=none;');
  });
});
