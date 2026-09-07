function collectRootElementsByType(definitions, type) {
  return (definitions.rootElements || []).filter((el) => el.$type === type);
}

function buildLaneParentMap(processes) {
  const map = new Map();
  processes.forEach((process) => {
    (process.laneSets || []).forEach((laneSet) => {
      (laneSet.lanes || []).forEach((lane) => {
        (lane.flowNodeRef || []).forEach((ref) => {
          const id = typeof ref === 'string' ? ref : ref.id;
          map.set(id, lane.id);
        });
      });
    });
  });
  return map;
}

function buildParticipantParentMap(collaborations) {
  const map = new Map();
  collaborations.forEach((collaboration) => {
    (collaboration.participants || []).forEach((participant) => {
      if (participant.processRef) {
        map.set(participant.processRef.id, participant.id);
      }
    });
  });
  return map;
}

function buildProcessIdByElementId(processes) {
  const map = new Map();
  processes.forEach((process) => {
    (process.flowElements || []).forEach((element) => {
      map.set(element.id, process.id);
    });
  });
  return map;
}

function eventDefinitionTypeOf(bpmnElement) {
  const definitions = bpmnElement.eventDefinitions;
  if (!definitions || definitions.length === 0) {
    return undefined;
  }
  const match = /^bpmn:(\w+)EventDefinition$/.exec(definitions[0].$type);
  if (!match) {
    return undefined;
  }
  return match[1].charAt(0).toLowerCase() + match[1].slice(1);
}

function isDefaultFlow(flowElement) {
  const source = flowElement.sourceRef;
  return !!(source && source.default && source.default.id === flowElement.id);
}

function buildDescriptors(definitions) {
  const processes = collectRootElementsByType(definitions, 'bpmn:Process');
  const collaborations = collectRootElementsByType(definitions, 'bpmn:Collaboration');
  const laneParentMap = buildLaneParentMap(processes);
  const participantParentMap = buildParticipantParentMap(collaborations);
  const processIdByElementId = buildProcessIdByElementId(processes);

  function resolveParent(bpmnElement) {
    if (laneParentMap.has(bpmnElement.id)) {
      return laneParentMap.get(bpmnElement.id);
    }
    const processId = processIdByElementId.get(bpmnElement.id);
    if (processId && participantParentMap.has(processId)) {
      return participantParentMap.get(processId);
    }
    return '1';
  }

  const nodes = [];
  const flows = [];

  const planeElements = (definitions.diagrams || []).flatMap(
    (diagram) => (diagram.plane && diagram.plane.planeElement) || []
  );

  planeElements.forEach((di) => {
    const bpmnElement = di.bpmnElement;
    if (!bpmnElement) {
      return;
    }

    if (di.$type === 'bpmndi:BPMNShape' && di.bounds) {
      nodes.push({
        id: bpmnElement.id,
        type: bpmnElement.$type,
        name: bpmnElement.name,
        x: di.bounds.x,
        y: di.bounds.y,
        width: di.bounds.width,
        height: di.bounds.height,
        parent: resolveParent(bpmnElement),
        eventDefinitionType: eventDefinitionTypeOf(bpmnElement),
        isInterrupting: bpmnElement.cancelActivity,
        isExpanded: di.isExpanded
      });
    } else if (di.$type === 'bpmndi:BPMNEdge') {
      flows.push({
        id: bpmnElement.id,
        type: bpmnElement.$type,
        name: bpmnElement.name,
        sourceId: bpmnElement.sourceRef && bpmnElement.sourceRef.id,
        targetId: bpmnElement.targetRef && bpmnElement.targetRef.id,
        waypoints: (di.waypoint || []).map((point) => ({ x: point.x, y: point.y })),
        parent: resolveParent(bpmnElement),
        hasCondition: !!bpmnElement.conditionExpression,
        isDefault: isDefaultFlow(bpmnElement),
        associationDirection: bpmnElement.associationDirection
      });
    }
  });

  return { nodes, flows };
}

module.exports = { buildDescriptors };
