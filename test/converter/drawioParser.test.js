const { parseDrawioCells } = require('../../src/converter/drawioParser');

const SAMPLE = `<mxfile host="Camunda Modeler">
  <diagram id="diagram-1" name="Page-1">
    <mxGraphModel>
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="Task_1" value="Do it &amp; done" style="shape=mxgraph.bpmn.task2;taskMarker=abstract;" vertex="1" parent="1">
          <mxGeometry x="10" y="20" width="100" height="80" as="geometry" />
        </mxCell>
        <mxCell id="Flow_1" style="edgeStyle=elbowEdgeStyle;" edge="1" parent="1" source="Task_1" target="Task_2">
          <mxGeometry relative="1" as="geometry">
            <Array as="points">
              <mxPoint x="60" y="120" />
            </Array>
          </mxGeometry>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

describe('parseDrawioCells', () => {
  it('ignores the two built-in root cells (id 0 and 1)', () => {
    const cells = parseDrawioCells(SAMPLE);
    expect(cells.map((cell) => cell.id)).toEqual(['Task_1', 'Flow_1']);
  });

  it('parses a vertex cell with its geometry and unescapes its value', () => {
    const [task] = parseDrawioCells(SAMPLE);
    expect(task).toMatchObject({
      id: 'Task_1',
      value: 'Do it & done',
      vertex: true,
      edge: false,
      parent: '1',
      geometry: { x: 10, y: 20, width: 100, height: 80 }
    });
  });

  it('parses an edge cell with its source/target and interior points', () => {
    const [, flow] = parseDrawioCells(SAMPLE);
    expect(flow).toMatchObject({
      id: 'Flow_1',
      edge: true,
      vertex: false,
      source: 'Task_1',
      target: 'Task_2',
      geometry: { points: [{ x: 60, y: 120 }] }
    });
  });

  it('unwraps a UserObject-wrapped cell (draw.io custom data/links), hoisting its id and label', () => {
    const withUserObject = `<mxGraphModel><root>
      <mxCell id="0" />
      <mxCell id="1" parent="0" />
      <UserObject id="Task_3" label="Ship it" link="https://example.com">
        <mxCell style="shape=mxgraph.bpmn.task2;" vertex="1" parent="1">
          <mxGeometry x="0" y="0" width="100" height="80" as="geometry" />
        </mxCell>
      </UserObject>
    </root></mxGraphModel>`;

    const cells = parseDrawioCells(withUserObject);
    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({ id: 'Task_3', value: 'Ship it', vertex: true });
  });

  it('unwraps the legacy <object> wrapper the same way', () => {
    const withObject = `<mxGraphModel><root>
      <mxCell id="0" />
      <mxCell id="1" parent="0" />
      <object id="Task_4" label="Legacy">
        <mxCell style="shape=mxgraph.bpmn.task2;" vertex="1" parent="1">
          <mxGeometry x="0" y="0" width="100" height="80" as="geometry" />
        </mxCell>
      </object>
    </root></mxGraphModel>`;

    const cells = parseDrawioCells(withObject);
    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({ id: 'Task_4', value: 'Legacy' });
  });
});
