const { buildDrawioXml } = require('../../src/converter/xmlBuilder');

describe('buildDrawioXml', () => {
  it('wraps cells in mxfile/diagram/mxGraphModel/root with default layer cells', () => {
    const xml = buildDrawioXml([]);

    expect(xml).toContain('<mxfile');
    expect(xml).toContain('<diagram');
    expect(xml).toContain('<mxGraphModel');
    expect(xml).toContain('<root>');
    expect(xml).toContain('<mxCell id="0" />');
    expect(xml).toContain('<mxCell id="1" parent="0" />');
  });

  it('serializes a vertex cell with geometry', () => {
    const xml = buildDrawioXml([
      {
        id: 'Task_1',
        value: 'Do something',
        style: 'rounded=1;whiteSpace=wrap;html=1;',
        vertex: true,
        parent: '1',
        geometry: { x: 40, y: 80, width: 100, height: 80 }
      }
    ]);

    expect(xml).toContain('<mxCell id="Task_1" value="Do something" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1">');
    expect(xml).toContain('<mxGeometry x="40" y="80" width="100" height="80" as="geometry" />');
  });

  it('serializes an edge cell with source/target and waypoints', () => {
    const xml = buildDrawioXml([
      {
        id: 'Flow_1',
        value: '',
        style: 'edgeStyle=orthogonalEdgeStyle;html=1;endArrow=block;endFill=1;',
        edge: true,
        parent: '1',
        source: 'Task_1',
        target: 'Task_2',
        geometry: {
          relative: true,
          points: [{ x: 100, y: 120 }, { x: 160, y: 120 }]
        }
      }
    ]);

    expect(xml).toContain('edge="1" parent="1" source="Task_1" target="Task_2"');
    expect(xml).toContain('<mxGeometry relative="1" as="geometry">');
    expect(xml).toContain('<Array as="points">');
    expect(xml).toContain('<mxPoint x="100" y="120" />');
    expect(xml).toContain('<mxPoint x="160" y="120" />');
  });

  it('escapes special XML characters in values', () => {
    const xml = buildDrawioXml([
      {
        id: 'Task_1',
        value: 'A & B <C> "quoted"',
        style: 'rounded=1;',
        vertex: true,
        parent: '1',
        geometry: { x: 0, y: 0, width: 10, height: 10 }
      }
    ]);

    expect(xml).toContain('value="A &amp; B &lt;C&gt; &quot;quoted&quot;"');
  });

  it('omits value attribute when value is empty', () => {
    const xml = buildDrawioXml([
      {
        id: 'Flow_1',
        value: '',
        style: 'edgeStyle=orthogonalEdgeStyle;',
        edge: true,
        parent: '1',
        source: 'A',
        target: 'B',
        geometry: { relative: true }
      }
    ]);

    expect(xml).not.toContain('value=""');
  });

  it('accepts a diagram name option', () => {
    const xml = buildDrawioXml([], { diagramName: 'Order Process' });

    expect(xml).toContain('name="Order Process"');
  });
});
