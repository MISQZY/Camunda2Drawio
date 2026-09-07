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
