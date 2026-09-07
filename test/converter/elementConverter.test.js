const { convertElement } = require('../../src/converter/elementConverter');

describe('convertElement', () => {
  it('converts a task into a single vertex cell with geometry from its bounds', () => {
    const cells = convertElement({
      id: 'Task_1',
      type: 'bpmn:UserTask',
      name: 'Review request',
      x: 100,
      y: 200,
      width: 120,
      height: 80
    });

    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({
      id: 'Task_1',
      value: 'Review request',
      vertex: true,
      parent: '1',
      geometry: { x: 100, y: 200, width: 120, height: 80 }
    });
    expect(cells[0].style).toContain('shape=mxgraph.bpmn.task2;');
    expect(cells[0].style).toContain('taskMarker=user;');
  });

  it('defaults value to an empty string when the element has no name', () => {
    const cells = convertElement({ id: 'Task_1', type: 'bpmn:Task', x: 0, y: 0, width: 100, height: 80 });

    expect(cells[0].value).toBe('');
  });

  it('clamps a text annotation to a narrow bracket width instead of the source diagram\'s wide label box', () => {
    const cells = convertElement({
      id: 'TextAnnotation_1',
      type: 'bpmn:TextAnnotation',
      name: 'Escalate after 2 days',
      x: 300,
      y: 10,
      width: 160,
      height: 40
    });

    expect(cells[0].geometry).toEqual({ x: 300, y: 10, width: 20, height: 40 });
    expect(cells[0].value).toBe('Escalate after 2 days');
  });

  it('uses a custom parent id when provided', () => {
    const cells = convertElement({
      id: 'Task_1',
      type: 'bpmn:Task',
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      parent: 'Lane_1'
    });

    expect(cells[0].parent).toBe('Lane_1');
  });

  it('converts a start event into a single cell using the preconfigured draw.io BPMN event shape', () => {
    const cells = convertElement({ id: 'Start_1', type: 'bpmn:StartEvent', x: 10, y: 10, width: 36, height: 36 });

    expect(cells).toHaveLength(1);
    expect(cells[0].style).toContain('shape=mxgraph.bpmn.event;');
    expect(cells[0].style).toContain('outline=standard;');
  });

  it('converts an intermediate event into a single cell with a double-border outline, no child markers', () => {
    const cells = convertElement({ id: 'Cat_1', type: 'bpmn:IntermediateCatchEvent', x: 0, y: 0, width: 40, height: 40 });

    expect(cells).toHaveLength(1);
    expect(cells[0].id).toBe('Cat_1');
    expect(cells[0].style).toContain('outline=catching;');
  });

  it('converts an exclusive gateway into a single cell using the preconfigured shape\'s X symbol, no child markers', () => {
    const cells = convertElement({ id: 'Gw_1', type: 'bpmn:ExclusiveGateway', x: 300, y: 100, width: 50, height: 50 });

    expect(cells).toHaveLength(1);
    expect(cells[0].id).toBe('Gw_1');
    expect(cells[0].style).toContain('shape=mxgraph.bpmn.gateway2;');
    expect(cells[0].style).toContain('gwType=exclusive;');
  });

  it('converts an inclusive gateway into a single cell using the preconfigured shape\'s thick circle marker', () => {
    const cells = convertElement({ id: 'Gw_2', type: 'bpmn:InclusiveGateway', x: 0, y: 0, width: 40, height: 40 });

    expect(cells).toHaveLength(1);
    expect(cells[0].style).toContain('outline=end;');
    expect(cells[0].style).toContain('symbol=general;');
  });

  it('renders a collapsed sub-process as a single cell - the "+" marker comes from the shape\'s own isLoopSub key', () => {
    const cells = convertElement({
      id: 'Sub_1',
      type: 'bpmn:SubProcess',
      name: 'Handle order',
      x: 0,
      y: 0,
      width: 200,
      height: 120,
      isExpanded: false
    });

    expect(cells).toHaveLength(1);
    expect(cells[0].style).toContain('shape=mxgraph.bpmn.task2;');
    expect(cells[0].style).toContain('isLoopSub=1;');
  });

  it('renders an expanded sub-process as a single container cell with no "+" marker', () => {
    const cells = convertElement({
      id: 'Sub_1',
      type: 'bpmn:SubProcess',
      x: 0,
      y: 0,
      width: 200,
      height: 120,
      isExpanded: true
    });

    expect(cells).toHaveLength(1);
    expect(cells[0].style).not.toContain('isLoopSub=1;');
  });
});
