const { parseStyleTokens, classifyVertexStyle, classifyEdgeStyle } = require('../../src/converter/reverseStyleMap');
const { resolveStyle } = require('../../src/converter/styleMap');

function tokensFor(descriptor) {
  return parseStyleTokens(resolveStyle(descriptor).style);
}

describe('parseStyleTokens', () => {
  it('splits key=value pairs and treats bare keys as boolean flags', () => {
    expect(parseStyleTokens('shape=mxgraph.bpmn.task2;swimlane;html=1;')).toEqual({
      shape: 'mxgraph.bpmn.task2',
      swimlane: true,
      html: '1'
    });
  });
});

describe('classifyVertexStyle round-tripping styleMap.js output', () => {
  it.each([
    ['bpmn:Task', {}],
    ['bpmn:UserTask', {}],
    ['bpmn:ServiceTask', {}],
    ['bpmn:ScriptTask', {}],
    ['bpmn:ManualTask', {}],
    ['bpmn:BusinessRuleTask', {}],
    ['bpmn:SendTask', {}],
    ['bpmn:ReceiveTask', {}],
    ['bpmn:CallActivity', {}]
  ])('recovers %s from its own generated style', (type, extra) => {
    expect(classifyVertexStyle(tokensFor({ type, ...extra }))).toEqual({ type });
  });

  it('recovers an expanded sub-process', () => {
    expect(classifyVertexStyle(tokensFor({ type: 'bpmn:SubProcess', isExpanded: true }))).toEqual({
      type: 'bpmn:SubProcess',
      isExpanded: true
    });
  });

  it('recovers a collapsed sub-process', () => {
    expect(classifyVertexStyle(tokensFor({ type: 'bpmn:SubProcess', isExpanded: false }))).toEqual({
      type: 'bpmn:SubProcess',
      isExpanded: false
    });
  });

  it.each([
    ['bpmn:StartEvent', undefined],
    ['bpmn:EndEvent', undefined],
    ['bpmn:IntermediateThrowEvent', undefined],
    ['bpmn:IntermediateCatchEvent', undefined]
  ])('recovers %s with no event definition', (type) => {
    expect(classifyVertexStyle(tokensFor({ type }))).toEqual({ type, eventDefinitionType: undefined });
  });

  it('recovers an interrupting boundary event', () => {
    expect(classifyVertexStyle(tokensFor({ type: 'bpmn:BoundaryEvent', isInterrupting: true }))).toEqual({
      type: 'bpmn:BoundaryEvent',
      isInterrupting: true,
      eventDefinitionType: undefined
    });
  });

  it('recovers a non-interrupting boundary event', () => {
    expect(classifyVertexStyle(tokensFor({ type: 'bpmn:BoundaryEvent', isInterrupting: false }))).toEqual({
      type: 'bpmn:BoundaryEvent',
      isInterrupting: false,
      eventDefinitionType: undefined
    });
  });

  it.each(['message', 'timer', 'escalation', 'conditional', 'link', 'error', 'cancel', 'compensate', 'signal', 'terminate'])(
    'recovers the %s event definition',
    (eventDefinitionType) => {
      expect(classifyVertexStyle(tokensFor({ type: 'bpmn:IntermediateCatchEvent', eventDefinitionType }))).toEqual({
        type: 'bpmn:IntermediateCatchEvent',
        eventDefinitionType
      });
    }
  );

  it.each(['bpmn:ExclusiveGateway', 'bpmn:ParallelGateway', 'bpmn:ComplexGateway', 'bpmn:InclusiveGateway', 'bpmn:EventBasedGateway'])(
    'recovers %s',
    (type) => {
      expect(classifyVertexStyle(tokensFor({ type }))).toEqual({ type });
    }
  );

  it('recovers a data object reference', () => {
    expect(classifyVertexStyle(tokensFor({ type: 'bpmn:DataObjectReference' }))).toEqual({ type: 'bpmn:DataObjectReference' });
  });

  it('recovers a data store reference', () => {
    expect(classifyVertexStyle(tokensFor({ type: 'bpmn:DataStoreReference' }))).toEqual({ type: 'bpmn:DataStoreReference' });
  });

  it('recovers a participant pool', () => {
    expect(classifyVertexStyle(tokensFor({ type: 'bpmn:Participant' }))).toEqual({ type: 'bpmn:Participant' });
  });

  it('recovers a lane', () => {
    expect(classifyVertexStyle(tokensFor({ type: 'bpmn:Lane' }))).toEqual({ type: 'bpmn:Lane' });
  });

  it('recovers a text annotation', () => {
    expect(classifyVertexStyle(tokensFor({ type: 'bpmn:TextAnnotation' }))).toEqual({ type: 'bpmn:TextAnnotation' });
  });

  it('recovers a group', () => {
    expect(classifyVertexStyle(tokensFor({ type: 'bpmn:Group' }))).toEqual({ type: 'bpmn:Group' });
  });
});

describe('classifyEdgeStyle round-tripping styleMap.js output', () => {
  it('recovers a plain sequence flow', () => {
    expect(classifyEdgeStyle(tokensFor({ type: 'bpmn:SequenceFlow' }))).toEqual({
      type: 'bpmn:SequenceFlow',
      hasCondition: false,
      isDefault: false
    });
  });

  it('recovers a conditional sequence flow', () => {
    expect(classifyEdgeStyle(tokensFor({ type: 'bpmn:SequenceFlow', hasCondition: true }))).toEqual({
      type: 'bpmn:SequenceFlow',
      hasCondition: true,
      isDefault: false
    });
  });

  it('recovers a default sequence flow', () => {
    expect(classifyEdgeStyle(tokensFor({ type: 'bpmn:SequenceFlow', isDefault: true }))).toEqual({
      type: 'bpmn:SequenceFlow',
      hasCondition: false,
      isDefault: true
    });
  });

  it('recovers a message flow', () => {
    expect(classifyEdgeStyle(tokensFor({ type: 'bpmn:MessageFlow' }))).toEqual({ type: 'bpmn:MessageFlow' });
  });

  it('recovers an undirected association', () => {
    expect(classifyEdgeStyle(tokensFor({ type: 'bpmn:Association' }))).toEqual({
      type: 'bpmn:Association',
      associationDirection: undefined
    });
  });

  it('recovers a one-directional association', () => {
    expect(classifyEdgeStyle(tokensFor({ type: 'bpmn:Association', associationDirection: 'One' }))).toEqual({
      type: 'bpmn:Association',
      associationDirection: 'One'
    });
  });

  it('recovers a bi-directional association', () => {
    expect(classifyEdgeStyle(tokensFor({ type: 'bpmn:Association', associationDirection: 'Both' }))).toEqual({
      type: 'bpmn:Association',
      associationDirection: 'Both'
    });
  });
});
