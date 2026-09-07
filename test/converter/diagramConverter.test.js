const { buildDescriptors } = require('../../src/converter/diagramConverter');

function task(id, name, defaultFlow) {
  return { $type: 'bpmn:Task', id, name, default: defaultFlow };
}

function shape(bpmnElement, bounds, extra = {}) {
  return { $type: 'bpmndi:BPMNShape', bpmnElement, bounds, ...extra };
}

function edge(bpmnElement, waypoint) {
  return { $type: 'bpmndi:BPMNEdge', bpmnElement, waypoint };
}

describe('buildDescriptors', () => {
  it('builds a node descriptor for each shape using its bounds and parents nodes at the top layer by default', () => {
    const taskA = task('Task_A', 'Do A');
    const process = { $type: 'bpmn:Process', id: 'Process_1', flowElements: [taskA] };
    const definitions = {
      rootElements: [process],
      diagrams: [{ plane: { planeElement: [shape(taskA, { x: 10, y: 20, width: 100, height: 80 })] } }]
    };

    const { nodes } = buildDescriptors(definitions);

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      id: 'Task_A',
      type: 'bpmn:Task',
      name: 'Do A',
      x: 10,
      y: 20,
      width: 100,
      height: 80,
      parent: '1'
    });
  });

  it('builds a flow descriptor with source, target and waypoints', () => {
    const taskA = task('Task_A', 'A');
    const taskB = task('Task_B', 'B');
    const flow = {
      $type: 'bpmn:SequenceFlow',
      id: 'Flow_1',
      name: '',
      sourceRef: taskA,
      targetRef: taskB
    };
    const process = { $type: 'bpmn:Process', id: 'Process_1', flowElements: [taskA, taskB, flow] };
    const definitions = {
      rootElements: [process],
      diagrams: [
        {
          plane: {
            planeElement: [
              shape(taskA, { x: 0, y: 0, width: 100, height: 80 }),
              shape(taskB, { x: 200, y: 0, width: 100, height: 80 }),
              edge(flow, [{ x: 100, y: 40 }, { x: 200, y: 40 }])
            ]
          }
        }
      ]
    };

    const { flows } = buildDescriptors(definitions);

    expect(flows).toHaveLength(1);
    expect(flows[0]).toMatchObject({
      id: 'Flow_1',
      type: 'bpmn:SequenceFlow',
      sourceId: 'Task_A',
      targetId: 'Task_B',
      waypoints: [{ x: 100, y: 40 }, { x: 200, y: 40 }],
      exitPoint: { x: 1, y: 0.5 },
      entryPoint: { x: 0, y: 0.5 },
      parent: '1'
    });
  });

  it('marks a flow as conditional when it has a condition expression', () => {
    const taskA = task('Task_A', 'A');
    const taskB = task('Task_B', 'B');
    const flow = {
      $type: 'bpmn:SequenceFlow',
      id: 'Flow_1',
      sourceRef: taskA,
      targetRef: taskB,
      conditionExpression: { $type: 'bpmn:FormalExpression', body: '${approved}' }
    };
    const definitions = {
      rootElements: [{ $type: 'bpmn:Process', id: 'P', flowElements: [taskA, taskB, flow] }],
      diagrams: [{ plane: { planeElement: [edge(flow, [{ x: 0, y: 0 }, { x: 10, y: 0 }])] } }]
    };

    const { flows } = buildDescriptors(definitions);

    expect(flows[0].hasCondition).toBe(true);
  });

  it('marks a flow as default when it is referenced by its source element default attribute', () => {
    const flow = { $type: 'bpmn:SequenceFlow', id: 'Flow_1', sourceRef: null, targetRef: null };
    const taskA = task('Task_A', 'A', flow);
    flow.sourceRef = taskA;
    flow.targetRef = task('Task_B', 'B');

    const definitions = {
      rootElements: [{ $type: 'bpmn:Process', id: 'P', flowElements: [taskA, flow] }],
      diagrams: [{ plane: { planeElement: [edge(flow, [{ x: 0, y: 0 }, { x: 10, y: 0 }])] } }]
    };

    const { flows } = buildDescriptors(definitions);

    expect(flows[0].isDefault).toBe(true);
  });

  it('resolves the event definition type for events that declare one', () => {
    const startEvent = {
      $type: 'bpmn:StartEvent',
      id: 'Start_1',
      eventDefinitions: [{ $type: 'bpmn:MessageEventDefinition' }]
    };
    const definitions = {
      rootElements: [{ $type: 'bpmn:Process', id: 'P', flowElements: [startEvent] }],
      diagrams: [{ plane: { planeElement: [shape(startEvent, { x: 0, y: 0, width: 36, height: 36 })] } }]
    };

    const { nodes } = buildDescriptors(definitions);

    expect(nodes[0].eventDefinitionType).toBe('message');
  });

  it('parents flow nodes assigned to a lane under that lane', () => {
    const taskA = task('Task_A', 'A');
    const lane = { $type: 'bpmn:Lane', id: 'Lane_1', flowNodeRef: [taskA] };
    const process = {
      $type: 'bpmn:Process',
      id: 'P',
      flowElements: [taskA],
      laneSets: [{ lanes: [lane] }]
    };
    const definitions = {
      rootElements: [process],
      diagrams: [
        {
          plane: {
            planeElement: [
              shape(lane, { x: 0, y: 0, width: 400, height: 200 }),
              shape(taskA, { x: 40, y: 40, width: 100, height: 80 })
            ]
          }
        }
      ]
    };

    const { nodes } = buildDescriptors(definitions);
    const taskNode = nodes.find((node) => node.id === 'Task_A');

    expect(taskNode.parent).toBe('Lane_1');
  });

  it('makes a node position relative to its parent container instead of the absolute page position', () => {
    const taskA = task('Task_A', 'A');
    const lane = { $type: 'bpmn:Lane', id: 'Lane_1', flowNodeRef: [taskA] };
    const process = {
      $type: 'bpmn:Process',
      id: 'P',
      flowElements: [taskA],
      laneSets: [{ lanes: [lane] }]
    };
    const definitions = {
      rootElements: [process],
      diagrams: [
        {
          plane: {
            planeElement: [
              shape(lane, { x: 20, y: 30, width: 400, height: 200 }),
              shape(taskA, { x: 60, y: 90, width: 100, height: 80 })
            ]
          }
        }
      ]
    };

    const { nodes } = buildDescriptors(definitions);
    const taskNode = nodes.find((node) => node.id === 'Task_A');

    expect(taskNode.x).toBe(40);
    expect(taskNode.y).toBe(60);
  });

  it('makes flow waypoints relative to the flow\'s parent container instead of the absolute page position', () => {
    const taskA = task('Task_A', 'A');
    const taskB = task('Task_B', 'B');
    const flow = { $type: 'bpmn:SequenceFlow', id: 'Flow_1', sourceRef: taskA, targetRef: taskB };
    const lane = { $type: 'bpmn:Lane', id: 'Lane_1', flowNodeRef: [taskA, taskB] };
    const process = {
      $type: 'bpmn:Process',
      id: 'P',
      flowElements: [taskA, taskB, flow],
      laneSets: [{ lanes: [lane] }]
    };
    const participant = { $type: 'bpmn:Participant', id: 'Participant_1', processRef: process };
    const collaboration = { $type: 'bpmn:Collaboration', id: 'Collab_1', participants: [participant] };
    const definitions = {
      rootElements: [collaboration, process],
      diagrams: [
        {
          plane: {
            planeElement: [
              shape(participant, { x: 40, y: 70, width: 600, height: 300 }),
              shape(lane, { x: 60, y: 100, width: 400, height: 200 }),
              shape(taskA, { x: 100, y: 160, width: 100, height: 80 }),
              shape(taskB, { x: 260, y: 160, width: 100, height: 80 }),
              edge(flow, [{ x: 200, y: 200 }, { x: 260, y: 200 }])
            ]
          }
        }
      ]
    };

    const { flows } = buildDescriptors(definitions);

    expect(flows[0].parent).toBe('Participant_1');
    expect(flows[0].waypoints).toEqual([{ x: 160, y: 130 }, { x: 220, y: 130 }]);
  });

  it('parents a lane under its participant pool', () => {
    const taskA = task('Task_A', 'A');
    const lane = { $type: 'bpmn:Lane', id: 'Lane_1', flowNodeRef: [taskA] };
    const process = {
      $type: 'bpmn:Process',
      id: 'P',
      flowElements: [taskA],
      laneSets: [{ lanes: [lane] }]
    };
    const participant = { $type: 'bpmn:Participant', id: 'Participant_1', processRef: process };
    const collaboration = { $type: 'bpmn:Collaboration', id: 'Collab_1', participants: [participant] };
    const definitions = {
      rootElements: [collaboration, process],
      diagrams: [
        {
          plane: {
            planeElement: [
              shape(participant, { x: 0, y: 0, width: 500, height: 250 }),
              shape(lane, { x: 20, y: 30, width: 480, height: 220 })
            ]
          }
        }
      ]
    };

    const { nodes } = buildDescriptors(definitions);
    const laneNode = nodes.find((node) => node.id === 'Lane_1');

    expect(laneNode.parent).toBe('Participant_1');
    expect(laneNode.x).toBe(20);
    expect(laneNode.y).toBe(30);
  });

  it('parents flow nodes under their participant when there is a collaboration without lanes', () => {
    const taskA = task('Task_A', 'A');
    const process = { $type: 'bpmn:Process', id: 'P', flowElements: [taskA] };
    const participant = { $type: 'bpmn:Participant', id: 'Participant_1', processRef: process };
    const collaboration = { $type: 'bpmn:Collaboration', id: 'Collab_1', participants: [participant] };
    const definitions = {
      rootElements: [collaboration, process],
      diagrams: [
        {
          plane: {
            planeElement: [
              shape(participant, { x: 0, y: 0, width: 600, height: 300 }),
              shape(taskA, { x: 40, y: 40, width: 100, height: 80 })
            ]
          }
        }
      ]
    };

    const { nodes } = buildDescriptors(definitions);
    const taskNode = nodes.find((node) => node.id === 'Task_A');
    const participantNode = nodes.find((node) => node.id === 'Participant_1');

    expect(taskNode.parent).toBe('Participant_1');
    expect(participantNode.parent).toBe('1');
  });

  it('passes through isExpanded from the DI shape', () => {
    const subProcess = { $type: 'bpmn:SubProcess', id: 'Sub_1', flowElements: [] };
    const definitions = {
      rootElements: [{ $type: 'bpmn:Process', id: 'P', flowElements: [subProcess] }],
      diagrams: [
        { plane: { planeElement: [shape(subProcess, { x: 0, y: 0, width: 200, height: 150 }, { isExpanded: false })] } }
      ]
    };

    const { nodes } = buildDescriptors(definitions);

    expect(nodes[0].isExpanded).toBe(false);
  });

  it('parents a sub-process\'s own flow elements under the sub-process, not the process root', () => {
    const innerTask = task('Inner_Task', 'Inner');
    const subProcess = {
      $type: 'bpmn:SubProcess',
      id: 'Sub_1',
      flowElements: [innerTask]
    };
    const definitions = {
      rootElements: [{ $type: 'bpmn:Process', id: 'P', flowElements: [subProcess] }],
      diagrams: [
        {
          plane: {
            planeElement: [
              shape(subProcess, { x: 100, y: 100, width: 300, height: 200 }),
              shape(innerTask, { x: 140, y: 150, width: 100, height: 80 })
            ]
          }
        }
      ]
    };

    const { nodes } = buildDescriptors(definitions);
    const innerNode = nodes.find((node) => node.id === 'Inner_Task');

    expect(innerNode.parent).toBe('Sub_1');
    expect(innerNode.x).toBe(40);
    expect(innerNode.y).toBe(50);
  });

  it('parents a sequence flow nested inside a sub-process under that sub-process', () => {
    const innerTaskA = task('Inner_A', 'A');
    const innerTaskB = task('Inner_B', 'B');
    const innerFlow = { $type: 'bpmn:SequenceFlow', id: 'Inner_Flow', sourceRef: innerTaskA, targetRef: innerTaskB };
    const subProcess = {
      $type: 'bpmn:SubProcess',
      id: 'Sub_1',
      flowElements: [innerTaskA, innerTaskB, innerFlow]
    };
    const definitions = {
      rootElements: [{ $type: 'bpmn:Process', id: 'P', flowElements: [subProcess] }],
      diagrams: [
        {
          plane: {
            planeElement: [
              shape(subProcess, { x: 100, y: 100, width: 400, height: 200 }),
              shape(innerTaskA, { x: 140, y: 150, width: 100, height: 80 }),
              shape(innerTaskB, { x: 320, y: 150, width: 100, height: 80 }),
              edge(innerFlow, [{ x: 240, y: 190 }, { x: 320, y: 190 }])
            ]
          }
        }
      ]
    };

    const { flows } = buildDescriptors(definitions);

    expect(flows[0].parent).toBe('Sub_1');
    expect(flows[0].waypoints).toEqual([{ x: 140, y: 90 }, { x: 220, y: 90 }]);
  });

  it('parents elements nested two sub-processes deep under their immediate sub-process', () => {
    const innerTask = task('Inner_Task', 'Inner');
    const innerSub = { $type: 'bpmn:SubProcess', id: 'Sub_Inner', flowElements: [innerTask] };
    const outerSub = { $type: 'bpmn:SubProcess', id: 'Sub_Outer', flowElements: [innerSub] };
    const definitions = {
      rootElements: [{ $type: 'bpmn:Process', id: 'P', flowElements: [outerSub] }],
      diagrams: [
        {
          plane: {
            planeElement: [
              shape(outerSub, { x: 0, y: 0, width: 500, height: 400 }),
              shape(innerSub, { x: 40, y: 40, width: 400, height: 300 }),
              shape(innerTask, { x: 80, y: 100, width: 100, height: 80 })
            ]
          }
        }
      ]
    };

    const { nodes } = buildDescriptors(definitions);
    const innerSubNode = nodes.find((node) => node.id === 'Sub_Inner');
    const innerTaskNode = nodes.find((node) => node.id === 'Inner_Task');

    expect(innerSubNode.parent).toBe('Sub_Outer');
    expect(innerTaskNode.parent).toBe('Sub_Inner');
  });
});
