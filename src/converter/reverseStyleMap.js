// The inverse of styleMap.js: given the style string draw.io wrote for a
// cell, work out which BPMN element/flow type produced it. Only the style
// keys styleMap.js itself ever writes are consulted, so a diagram exported
// by this same plugin round-trips exactly; a hand-drawn draw.io diagram
// using the same "BPMN 2.0" shape library styles round-trips too, since
// those are the same keys the shape library itself uses.

function parseStyleTokens(style) {
  const tokens = {};
  (style || '').split(';').forEach((part) => {
    if (!part) {
      return;
    }
    const eqIndex = part.indexOf('=');
    if (eqIndex === -1) {
      tokens[part] = true;
    } else {
      tokens[part.slice(0, eqIndex)] = part.slice(eqIndex + 1);
    }
  });
  return tokens;
}

const TASK_TYPE_BY_MARKER = {
  abstract: 'bpmn:Task',
  user: 'bpmn:UserTask',
  service: 'bpmn:ServiceTask',
  script: 'bpmn:ScriptTask',
  manual: 'bpmn:ManualTask',
  businessRule: 'bpmn:BusinessRuleTask',
  send: 'bpmn:SendTask',
  receive: 'bpmn:ReceiveTask'
};

const EVENT_TYPE_BY_OUTLINE = {
  standard: 'bpmn:StartEvent',
  end: 'bpmn:EndEvent',
  throwing: 'bpmn:IntermediateThrowEvent',
  catching: 'bpmn:IntermediateCatchEvent'
};

const EVENT_DEFINITION_BY_SYMBOL = {
  message: 'message',
  timer: 'timer',
  escalation: 'escalation',
  conditional: 'conditional',
  link: 'link',
  error: 'error',
  cancel: 'cancel',
  compensation: 'compensate',
  signal: 'signal',
  terminate: 'terminate'
};

function classifyVertexStyle(tokens) {
  if (tokens.shape === 'mxgraph.bpmn.task2') {
    if (tokens.bpmnShapeType === 'call') {
      return { type: 'bpmn:CallActivity' };
    }
    if (tokens.isLoopSub === '1') {
      return { type: 'bpmn:SubProcess', isExpanded: false };
    }
    if (tokens.verticalAlign === 'top' && tokens.align === 'left' && tokens.spacingLeft === '5') {
      return { type: 'bpmn:SubProcess', isExpanded: true };
    }
    return { type: TASK_TYPE_BY_MARKER[tokens.taskMarker] || 'bpmn:Task' };
  }

  if (tokens.shape === 'mxgraph.bpmn.event') {
    const eventDefinitionType = EVENT_DEFINITION_BY_SYMBOL[tokens.symbol];
    if (tokens.outline === 'boundInt') {
      return { type: 'bpmn:BoundaryEvent', isInterrupting: true, eventDefinitionType };
    }
    if (tokens.outline === 'boundNonint') {
      return { type: 'bpmn:BoundaryEvent', isInterrupting: false, eventDefinitionType };
    }
    return { type: EVENT_TYPE_BY_OUTLINE[tokens.outline] || 'bpmn:IntermediateThrowEvent', eventDefinitionType };
  }

  if (tokens.shape === 'mxgraph.bpmn.gateway2') {
    if (tokens.gwType === 'exclusive') return { type: 'bpmn:ExclusiveGateway' };
    if (tokens.gwType === 'parallel') return { type: 'bpmn:ParallelGateway' };
    if (tokens.gwType === 'complex') return { type: 'bpmn:ComplexGateway' };
    if (tokens.outline === 'catching') return { type: 'bpmn:EventBasedGateway' };
    return { type: 'bpmn:InclusiveGateway' };
  }

  if (tokens.shape === 'mxgraph.bpmn.data2') {
    return { type: 'bpmn:DataObjectReference' };
  }
  if (tokens.shape === 'datastore') {
    return { type: 'bpmn:DataStoreReference' };
  }
  if (tokens.shape === 'mxgraph.flowchart.annotation_1') {
    return { type: 'bpmn:TextAnnotation' };
  }

  if (tokens.swimlane === true) {
    return { type: tokens.startSize === '30' ? 'bpmn:Participant' : 'bpmn:Lane' };
  }

  if (tokens.dashPattern === '8 3 1 3') {
    return { type: 'bpmn:Group' };
  }

  return { type: 'bpmn:Task' };
}

function classifyEdgeStyle(tokens) {
  if (tokens.dashPattern === '8 4') {
    return { type: 'bpmn:MessageFlow' };
  }

  if (tokens.dashPattern === '1 4') {
    const startOpen = tokens.startArrow === 'openThin';
    const endOpen = tokens.endArrow === 'openThin';
    let associationDirection;
    if (startOpen && endOpen) {
      associationDirection = 'Both';
    } else if (endOpen) {
      associationDirection = 'One';
    }
    return { type: 'bpmn:Association', associationDirection };
  }

  return {
    type: 'bpmn:SequenceFlow',
    hasCondition: tokens.startArrow === 'diamondThin',
    isDefault: tokens.startArrow === 'dash'
  };
}

module.exports = { parseStyleTokens, classifyVertexStyle, classifyEdgeStyle };
