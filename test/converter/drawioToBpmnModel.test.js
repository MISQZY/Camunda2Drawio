const { buildDrawioModel } = require('../../src/converter/drawioToBpmnModel');

function twoTasksAndAnEdge(edgeGeometryXml) {
  return `<mxGraphModel><root>
    <mxCell id="0" />
    <mxCell id="1" parent="0" />
    <mxCell id="A" value="A" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1">
      <mxGeometry x="40" y="40" width="120" height="60" as="geometry" />
    </mxCell>
    <mxCell id="B" value="B" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1">
      <mxGeometry x="300" y="200" width="120" height="60" as="geometry" />
    </mxCell>
    <mxCell id="Flow" style="edgeStyle=orthogonalEdgeStyle;html=1;" edge="1" parent="1" source="A" target="B">
      ${edgeGeometryXml}
    </mxCell>
  </root></mxGraphModel>`;
}

describe('buildDrawioModel edge waypoints', () => {
  it('lands a floating (no exit/entry point) connection on each shape\'s own border, not a shared corner', () => {
    const xml = twoTasksAndAnEdge('<mxGeometry relative="1" as="geometry" />');
    const { edges } = buildDrawioModel(xml);

    const [start, end] = edges[0].waypoints;
    // A is x:40 y:40 120x60 (bottom edge at y=100); B is x:300 y:200 120x60 (top edge at y=200).
    // The two points must differ and each sit on its own shape's boundary, not collapse onto B's corner.
    expect(start).not.toEqual(end);
    expect(start.y).toBe(100);
    expect(end.y).toBe(200);
  });

  it('still honors an explicit fixed exit/entry point when the style provides one', () => {
    const xmlWithFixedPoints = twoTasksAndAnEdge('<mxGeometry relative="1" as="geometry" />').replace(
      'style="edgeStyle=orthogonalEdgeStyle;html=1;"',
      'style="edgeStyle=orthogonalEdgeStyle;html=1;exitX=1;exitY=0.5;entryX=0;entryY=0.5;"'
    );
    const { edges } = buildDrawioModel(xmlWithFixedPoints);

    const [start, end] = edges[0].waypoints;
    expect(start).toEqual({ x: 160, y: 70 });
    expect(end).toEqual({ x: 300, y: 230 });
  });
});

describe('buildDrawioModel pools and lanes', () => {
  it('classifies a hand-drawn pool/lane pair by containment, not by startSize', () => {
    // Both swimlanes share startSize=20 - this tool's own export always uses
    // 30 for a pool and 20 for a lane, but a real draw.io pool is dragged
    // to whatever header size the user picked, so that number can't be
    // trusted; only "is it nested inside another swimlane" can.
    const xml = `<mxGraphModel><root>
      <mxCell id="0" />
      <mxCell id="1" parent="0" />
      <mxCell id="Pool" value="Company" style="swimlane;horizontal=0;startSize=20;" vertex="1" parent="1">
        <mxGeometry x="0" y="0" width="600" height="300" as="geometry" />
      </mxCell>
      <mxCell id="Lane" value="Team" style="swimlane;horizontal=0;startSize=20;" vertex="1" parent="Pool">
        <mxGeometry x="20" y="0" width="580" height="300" as="geometry" />
      </mxCell>
    </root></mxGraphModel>`;

    const { nodes } = buildDrawioModel(xml);
    expect(nodes.get('Pool').type).toBe('bpmn:Participant');
    expect(nodes.get('Lane').type).toBe('bpmn:Lane');
  });

  it('flattens a plain (Ctrl+G) group, re-parenting its children instead of emitting a bogus task', () => {
    const xml = `<mxGraphModel><root>
      <mxCell id="0" />
      <mxCell id="1" parent="0" />
      <mxCell id="Grp" style="group" vertex="1" connectable="0" parent="1">
        <mxGeometry x="100" y="50" width="200" height="150" as="geometry" />
      </mxCell>
      <mxCell id="Inner" value="Do work" style="shape=mxgraph.bpmn.task2;taskMarker=abstract;" vertex="1" parent="Grp">
        <mxGeometry x="10" y="10" width="120" height="80" as="geometry" />
      </mxCell>
    </root></mxGraphModel>`;

    const { nodes } = buildDrawioModel(xml);
    expect(nodes.has('Grp')).toBe(false);
    expect([...nodes.values()].some((node) => node.type === '__drawio:Group')).toBe(false);

    const inner = nodes.get('Inner');
    expect(inner.containerId).toBe('1');
    expect(inner.absoluteBounds).toEqual({ x: 110, y: 60, width: 120, height: 80 });
  });

  it('drops a vertex parented to an edge (a draw.io edge label/icon), instead of emitting a stray task', () => {
    const xml = `<mxGraphModel><root>
      <mxCell id="0" />
      <mxCell id="1" parent="0" />
      <mxCell id="A" value="A" style="rounded=0;" vertex="1" parent="1">
        <mxGeometry x="0" y="0" width="100" height="60" as="geometry" />
      </mxCell>
      <mxCell id="B" value="B" style="rounded=0;" vertex="1" parent="1">
        <mxGeometry x="300" y="0" width="100" height="60" as="geometry" />
      </mxCell>
      <mxCell id="Flow" style="dashed=1;dashPattern=8 4;" edge="1" parent="1" source="A" target="B">
        <mxGeometry relative="1" as="geometry" />
      </mxCell>
      <mxCell id="Label" value="Order" style="shape=message;html=1;" vertex="1" connectable="0" parent="Flow">
        <mxGeometry relative="1" as="geometry" />
      </mxCell>
    </root></mxGraphModel>`;

    const { nodes } = buildDrawioModel(xml);
    expect(nodes.has('Label')).toBe(false);
    expect(nodes.size).toBe(2);
  });
});
