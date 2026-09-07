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
    expect(cells[0].style).toContain('rounded=1;whiteSpace=wrap;html=1;');
  });

  it('defaults value to an empty string when the element has no name', () => {
    const cells = convertElement({ id: 'Task_1', type: 'bpmn:Task', x: 0, y: 0, width: 100, height: 80 });

    expect(cells[0].value).toBe('');
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

  it('converts a start event into a single ellipse cell', () => {
    const cells = convertElement({ id: 'Start_1', type: 'bpmn:StartEvent', x: 10, y: 10, width: 36, height: 36 });

    expect(cells).toHaveLength(1);
    expect(cells[0].style).toContain('ellipse;whiteSpace=wrap;html=1;');
  });

  it('adds a centered marker glyph child cell for a gateway', () => {
    const cells = convertElement({ id: 'Gw_1', type: 'bpmn:ExclusiveGateway', x: 300, y: 100, width: 50, height: 50 });

    expect(cells).toHaveLength(2);
    const [gateway, marker] = cells;
    expect(gateway.id).toBe('Gw_1');
    expect(marker.value).toBe('X');
    expect(marker.parent).toBe('Gw_1');
    expect(marker.geometry).toMatchObject({ x: 10, y: 10, width: 30, height: 30 });
  });

  it('does not add a marker child cell for a gateway type without a glyph mapping is not applicable (all gateways have glyphs)', () => {
    const cells = convertElement({ id: 'Gw_2', type: 'bpmn:ParallelGateway', x: 0, y: 0, width: 40, height: 40 });

    expect(cells).toHaveLength(2);
    expect(cells[1].value).toBe('+');
  });

  it('adds a plus marker child cell for a collapsed sub-process', () => {
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

    expect(cells).toHaveLength(2);
    expect(cells[1].value).toBe('+');
    expect(cells[1].parent).toBe('Sub_1');
  });

  it('does not add a plus marker for an expanded sub-process', () => {
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
  });

  it('passes event definition type through to the style', () => {
    const cells = convertElement({
      id: 'Start_1',
      type: 'bpmn:StartEvent',
      x: 0,
      y: 0,
      width: 36,
      height: 36,
      eventDefinitionType: 'message'
    });

    expect(cells[0].style).toContain('bpmnEventDefinition=message;');
  });
});
