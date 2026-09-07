const { convertFlow } = require('../../src/converter/edgeConverter');

describe('convertFlow', () => {
  it('converts a sequence flow into an edge cell with source and target', () => {
    const cells = convertFlow({
      id: 'Flow_1',
      type: 'bpmn:SequenceFlow',
      name: 'approved',
      sourceId: 'Task_1',
      targetId: 'Gateway_1',
      waypoints: [{ x: 220, y: 240 }, { x: 300, y: 240 }]
    });

    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({
      id: 'Flow_1',
      value: 'approved',
      edge: true,
      parent: '1',
      source: 'Task_1',
      target: 'Gateway_1'
    });
    expect(cells[0].style).toContain('endArrow=blockThin;endFill=1;');
  });

  it('defaults value to an empty string when the flow has no name', () => {
    const cells = convertFlow({
      id: 'Flow_1',
      type: 'bpmn:SequenceFlow',
      sourceId: 'A',
      targetId: 'B',
      waypoints: [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    });

    expect(cells[0].value).toBe('');
  });

  it('omits the points array when there are only two waypoints', () => {
    const cells = convertFlow({
      id: 'Flow_1',
      type: 'bpmn:SequenceFlow',
      sourceId: 'A',
      targetId: 'B',
      waypoints: [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    });

    expect(cells[0].geometry.points).toBeUndefined();
    expect(cells[0].geometry.relative).toBe(true);
  });

  it('keeps interior waypoints as the points array, dropping the endpoints', () => {
    const cells = convertFlow({
      id: 'Flow_1',
      type: 'bpmn:SequenceFlow',
      sourceId: 'A',
      targetId: 'B',
      waypoints: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 100 }, { x: 200, y: 100 }]
    });

    expect(cells[0].geometry.points).toEqual([{ x: 50, y: 0 }, { x: 50, y: 100 }]);
  });

  it('marks a conditional flow with the diamond start marker', () => {
    const cells = convertFlow({
      id: 'Flow_1',
      type: 'bpmn:SequenceFlow',
      sourceId: 'A',
      targetId: 'B',
      waypoints: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      hasCondition: true
    });

    expect(cells[0].style).toContain('startArrow=diamondThin;startFill=0;');
  });

  it('converts a message flow with a dashed style', () => {
    const cells = convertFlow({
      id: 'MsgFlow_1',
      type: 'bpmn:MessageFlow',
      sourceId: 'A',
      targetId: 'B',
      waypoints: [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    });

    expect(cells[0].style).toContain('dashed=1;');
    expect(cells[0].style).toContain('startArrow=oval;startFill=0;');
  });

  it('converts an association with no arrowheads by default', () => {
    const cells = convertFlow({
      id: 'Assoc_1',
      type: 'bpmn:Association',
      sourceId: 'A',
      targetId: 'B',
      waypoints: [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    });

    expect(cells[0].style).toContain('endArrow=none;');
    expect(cells[0].style).toContain('startArrow=none;');
  });

  it('fixes the edge endpoints to the given exit and entry boundary fractions', () => {
    const cells = convertFlow({
      id: 'Flow_1',
      type: 'bpmn:SequenceFlow',
      sourceId: 'A',
      targetId: 'B',
      waypoints: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      exitPoint: { x: 1, y: 0.5 },
      entryPoint: { x: 0, y: 0.5 }
    });

    expect(cells[0].style).toContain('exitX=1;exitY=0.5;exitDx=0;exitDy=0;');
    expect(cells[0].style).toContain('entryX=0;entryY=0.5;entryDx=0;entryDy=0;');
  });

  it('leaves the endpoints floating when no exit or entry point is given', () => {
    const cells = convertFlow({
      id: 'Flow_1',
      type: 'bpmn:SequenceFlow',
      sourceId: 'A',
      targetId: 'B',
      waypoints: [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    });

    expect(cells[0].style).not.toContain('exitX');
    expect(cells[0].style).not.toContain('entryX');
  });

  it('uses a custom parent id when provided', () => {
    const cells = convertFlow({
      id: 'Flow_1',
      type: 'bpmn:SequenceFlow',
      sourceId: 'A',
      targetId: 'B',
      waypoints: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      parent: 'Lane_1'
    });

    expect(cells[0].parent).toBe('Lane_1');
  });
});
