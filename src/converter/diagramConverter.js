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

function buildLaneProcessIdMap(processes) {
  const map = new Map();
  processes.forEach((process) => {
    (process.laneSets || []).forEach((laneSet) => {
      (laneSet.lanes || []).forEach((lane) => {
        map.set(lane.id, process.id);
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

// bpmn-moddle keeps a sub-process's own contents in its own `flowElements`
// array rather than the top-level process's, so a plain id lookup against
// the process never finds them; walk each sub-process (and any nested
// inside it) to map every element it directly contains to its own id.
function buildSubProcessParentMap(processes) {
  const map = new Map();

  function walk(elements, containerId) {
    (elements || []).forEach((element) => {
      if (containerId) {
        map.set(element.id, containerId);
      }
      if (element.flowElements) {
        walk(element.flowElements, element.id);
      }
    });
  }

  processes.forEach((process) => walk(process.flowElements, null));

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

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function toRelativePoints(points, originBounds) {
  if (!originBounds) {
    return points;
  }
  return points.map((point) => ({ x: point.x - originBounds.x, y: point.y - originBounds.y }));
}

function toBoundaryFraction(point, bounds) {
  if (!bounds || !bounds.width || !bounds.height) {
    return null;
  }
  return {
    x: round(clamp01((point.x - bounds.x) / bounds.width)),
    y: round(clamp01((point.y - bounds.y) / bounds.height))
  };
}

function buildDescriptors(definitions) {
  const processes = collectRootElementsByType(definitions, 'bpmn:Process');
  const collaborations = collectRootElementsByType(definitions, 'bpmn:Collaboration');
  const laneParentMap = buildLaneParentMap(processes);
  const laneProcessIdMap = buildLaneProcessIdMap(processes);
  const participantParentMap = buildParticipantParentMap(collaborations);
  const processIdByElementId = buildProcessIdByElementId(processes);
  const subProcessParentMap = buildSubProcessParentMap(processes);

  function resolveParent(bpmnElement) {
    if (subProcessParentMap.has(bpmnElement.id)) {
      return subProcessParentMap.get(bpmnElement.id);
    }
    if (laneParentMap.has(bpmnElement.id)) {
      return laneParentMap.get(bpmnElement.id);
    }
    if (bpmnElement.$type === 'bpmn:Lane' && laneProcessIdMap.has(bpmnElement.id)) {
      const processId = laneProcessIdMap.get(bpmnElement.id);
      if (participantParentMap.has(processId)) {
        return participantParentMap.get(processId);
      }
    }
    const processId = processIdByElementId.get(bpmnElement.id);
    if (processId && participantParentMap.has(processId)) {
      return participantParentMap.get(processId);
    }
    return '1';
  }

  const planeElements = (definitions.diagrams || []).flatMap(
    (diagram) => (diagram.plane && diagram.plane.planeElement) || []
  );

  const shapeElements = planeElements.filter((di) => di.$type === 'bpmndi:BPMNShape' && di.bpmnElement && di.bounds);
  const edgeElements = planeElements.filter((di) => di.$type === 'bpmndi:BPMNEdge' && di.bpmnElement);

  const nodes = shapeElements.map((di) => {
    const bpmnElement = di.bpmnElement;
    return {
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
    };
  });

  // absolute bounds captured before nodes are mutated to parent-relative
  // coordinates below; flows need these same absolute bounds to convert
  // their own waypoints and to compute exit/entry boundary fractions
  const absoluteBoundsById = new Map(nodes.map((node) => [node.id, { x: node.x, y: node.y, width: node.width, height: node.height }]));

  const flows = edgeElements.map((di) => {
    const bpmnElement = di.bpmnElement;
    const parent = resolveParent(bpmnElement);
    const absoluteWaypoints = (di.waypoint || []).map((point) => ({ x: point.x, y: point.y }));
    const sourceId = bpmnElement.sourceRef && bpmnElement.sourceRef.id;
    const targetId = bpmnElement.targetRef && bpmnElement.targetRef.id;
    const firstPoint = absoluteWaypoints[0];
    const lastPoint = absoluteWaypoints[absoluteWaypoints.length - 1];

    return {
      id: bpmnElement.id,
      type: bpmnElement.$type,
      name: bpmnElement.name,
      sourceId,
      targetId,
      waypoints: toRelativePoints(absoluteWaypoints, absoluteBoundsById.get(parent)),
      exitPoint: firstPoint ? toBoundaryFraction(firstPoint, absoluteBoundsById.get(sourceId)) : null,
      entryPoint: lastPoint ? toBoundaryFraction(lastPoint, absoluteBoundsById.get(targetId)) : null,
      parent,
      hasCondition: !!bpmnElement.conditionExpression,
      isDefault: isDefaultFlow(bpmnElement),
      associationDirection: bpmnElement.associationDirection
    };
  });

  normalizeToParentRelativeCoordinates(nodes, absoluteBoundsById);

  return { nodes, flows };
}

function normalizeToParentRelativeCoordinates(nodes, absoluteBoundsById) {
  nodes.forEach((node) => {
    if (node.parent === '1') {
      return;
    }
    const parentAbsolute = absoluteBoundsById.get(node.parent);
    if (!parentAbsolute) {
      return;
    }
    node.x -= parentAbsolute.x;
    node.y -= parentAbsolute.y;
  });
}

module.exports = { buildDescriptors };
