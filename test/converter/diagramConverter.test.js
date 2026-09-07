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
});
