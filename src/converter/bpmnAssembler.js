// The counterpart to diagramConverter.js's resolveParent (which walks BPMN
// containment down to a flat drawio parent id): this walks the flat drawio
// parent id back up into BPMN containment - which process a node's
// flowElement belongs to, which lane (if any) references it, and which
// sub-process nests it.

function isParticipant(node) {
  return node.type === 'bpmn:Participant';
}

function isLane(node) {
  return node.type === 'bpmn:Lane';
}

function isSubProcess(node) {
  return node.type === 'bpmn:SubProcess';
}

function isArtifact(node) {
  return node.type === 'bpmn:TextAnnotation' || node.type === 'bpmn:Group';
}

function assembleBpmnModel(nodes, edges) {
  const participants = [...nodes.values()].filter(isParticipant);
  const lanes = [...nodes.values()].filter(isLane);
  const hasCollaboration = participants.length > 0 || edges.some((edge) => edge.type === 'bpmn:MessageFlow');

  const defaultProcessId = 'Process_1';
  const participantProcessId = new Map();
  participants.forEach((participant) => participantProcessId.set(participant.id, `${participant.id}_process`));

  // A message flow needs a pool to attach to even if the source diagram
  // never drew one explicitly.
  if (hasCollaboration && participants.length === 0) {
    participantProcessId.set('Participant_1', defaultProcessId);
    participants.push({ id: 'Participant_1', name: undefined });
  }

  const processesById = new Map();
  function ensureProcess(id) {
    if (!processesById.has(id)) {
      processesById.set(id, { id, laneSets: new Map(), flowElements: [] });
    }
    return processesById.get(id);
  }

  participants.forEach((participant) => ensureProcess(participantProcessId.get(participant.id)));
  if (!hasCollaboration) {
    ensureProcess(defaultProcessId);
  }

  function resolveContainer(containerId) {
    if (!containerId || containerId === '1') {
      return hasCollaboration ? { kind: 'collaboration' } : { kind: 'process', id: defaultProcessId };
    }
    if (participantProcessId.has(containerId)) {
      return { kind: 'process', id: participantProcessId.get(containerId) };
    }
    const containerNode = nodes.get(containerId);
    if (containerNode && isLane(containerNode)) {
      return resolveContainer(containerNode.containerId);
    }
    if (containerNode && isSubProcess(containerNode)) {
      return { kind: 'subProcess', id: containerId };
    }
    return hasCollaboration ? { kind: 'collaboration' } : { kind: 'process', id: defaultProcessId };
  }

  // A lane must always land in a real process, even if its own drawio
  // parent chain is malformed enough to fall through to "collaboration".
  function resolveLaneProcessId(lane) {
    const owner = resolveContainer(lane.containerId);
    if (owner.kind === 'process') {
      return owner.id;
    }
    ensureProcess(defaultProcessId);
    return defaultProcessId;
  }

  lanes.forEach((lane) => {
    const processId = resolveLaneProcessId(lane);
    const process = ensureProcess(processId);
    const laneSetId = `LaneSet_${processId}`;
    if (!process.laneSets.has(laneSetId)) {
      process.laneSets.set(laneSetId, { id: laneSetId, lanes: [] });
    }
    process.laneSets.get(laneSetId).lanes.push({ id: lane.id, name: lane.name, flowNodeRefs: [] });
  });

  const subProcessChildren = new Map();
  function addChild(subProcessId, element) {
    if (!subProcessChildren.has(subProcessId)) {
      subProcessChildren.set(subProcessId, []);
    }
    subProcessChildren.get(subProcessId).push(element);
  }

  const collaborationArtifacts = [];
  const collaborationMessageFlows = [];

  const defaultFlowIdByNodeId = new Map();
  edges.forEach((edge) => {
    if (edge.isDefault && edge.sourceId) {
      defaultFlowIdByNodeId.set(edge.sourceId, edge.id);
    }
  });

  nodes.forEach((node) => {
    if (isParticipant(node) || isLane(node)) {
      return;
    }
    node.defaultFlowId = defaultFlowIdByNodeId.get(node.id);

    const owner = resolveContainer(node.containerId);
    if (owner.kind === 'subProcess') {
      addChild(owner.id, node);
      return;
    }
    if (owner.kind === 'collaboration') {
      if (isArtifact(node)) {
        collaborationArtifacts.push(node);
      } else {
        ensureProcess(defaultProcessId).flowElements.push(node);
      }
      return;
    }

    const process = ensureProcess(owner.id);
    process.flowElements.push(node);

    const parentNode = nodes.get(node.containerId);
    if (parentNode && isLane(parentNode)) {
      const laneSet = process.laneSets.get(`LaneSet_${owner.id}`);
      const lane = laneSet && laneSet.lanes.find((entry) => entry.id === parentNode.id);
      if (lane) {
        lane.flowNodeRefs.push(node.id);
      }
    }
  });

  edges.forEach((edge) => {
    if (edge.type === 'bpmn:MessageFlow') {
      collaborationMessageFlows.push(edge);
      return;
    }

    const owner = resolveContainer(edge.containerId);
    if (owner.kind === 'subProcess') {
      addChild(owner.id, edge);
      return;
    }
    if (owner.kind === 'collaboration') {
      if (edge.type === 'bpmn:Association') {
        collaborationArtifacts.push(edge);
      } else {
        ensureProcess(defaultProcessId).flowElements.push(edge);
      }
      return;
    }

    ensureProcess(owner.id).flowElements.push(edge);
  });

  function attachChildren(element) {
    if (element.kind === 'node' && isSubProcess(element)) {
      element.children = (subProcessChildren.get(element.id) || []).map(attachChildren);
    }
    return element;
  }
  processesById.forEach((process) => {
    process.flowElements = process.flowElements.map(attachChildren);
  });

  const collaboration = hasCollaboration
    ? {
        id: 'Collaboration_1',
        participants: participants.map((participant) => ({
          id: participant.id,
          name: participant.name,
          processId: participantProcessId.get(participant.id)
        })),
        artifacts: collaborationArtifacts,
        messageFlows: collaborationMessageFlows
      }
    : null;

  return { collaboration, processes: [...processesById.values()] };
}

module.exports = { assembleBpmnModel };
