const XML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;'
};

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);
}

function attr(name, value) {
  return `${name}="${escapeXml(value)}"`;
}

function buildGeometryXml(geometry) {
  if (!geometry) {
    return '';
  }

  const attrs = [];
  if (geometry.x !== undefined) attrs.push(attr('x', geometry.x));
  if (geometry.y !== undefined) attrs.push(attr('y', geometry.y));
  if (geometry.width !== undefined) attrs.push(attr('width', geometry.width));
  if (geometry.height !== undefined) attrs.push(attr('height', geometry.height));
  if (geometry.relative) attrs.push(attr('relative', '1'));
  attrs.push(attr('as', 'geometry'));

  // A floating line marker (no source/target vertex) needs explicit
  // sourcePoint/targetPoint child points instead of a points waypoint array.
  if (geometry.sourcePoint && geometry.targetPoint) {
    return [
      `<mxGeometry ${attrs.join(' ')}>`,
      `        <mxPoint ${attr('x', geometry.sourcePoint.x)} ${attr('y', geometry.sourcePoint.y)} ${attr('as', 'sourcePoint')} />`,
      `        <mxPoint ${attr('x', geometry.targetPoint.x)} ${attr('y', geometry.targetPoint.y)} ${attr('as', 'targetPoint')} />`,
      '      </mxGeometry>'
    ].join('\n');
  }

  if (geometry.points && geometry.points.length > 0) {
    const points = geometry.points
      .map((point) => `          <mxPoint ${attr('x', point.x)} ${attr('y', point.y)} />`)
      .join('\n');
    return [
      `<mxGeometry ${attrs.join(' ')}>`,
      '        <Array as="points">',
      points,
      '        </Array>',
      '      </mxGeometry>'
    ].join('\n');
  }

  return `<mxGeometry ${attrs.join(' ')} />`;
}

function buildCellXml(cell) {
  const attrs = [attr('id', cell.id)];

  if (cell.value) {
    attrs.push(attr('value', cell.value));
  }
  if (cell.style) {
    attrs.push(attr('style', cell.style));
  }
  if (cell.vertex) {
    attrs.push(attr('vertex', '1'));
  }
  if (cell.edge) {
    attrs.push(attr('edge', '1'));
  }
  if (cell.parent !== undefined) {
    attrs.push(attr('parent', cell.parent));
  }
  if (cell.source) {
    attrs.push(attr('source', cell.source));
  }
  if (cell.target) {
    attrs.push(attr('target', cell.target));
  }

  const geometryXml = buildGeometryXml(cell.geometry);
  if (!geometryXml) {
    return `      <mxCell ${attrs.join(' ')} />`;
  }

  return [`      <mxCell ${attrs.join(' ')}>`, `        ${geometryXml}`, '      </mxCell>'].join('\n');
}

function buildDrawioXml(cells, options = {}) {
  const diagramName = options.diagramName || 'Page-1';
  const diagramId = options.diagramId || 'diagram-1';
  const host = options.host || 'Camunda Modeler';

  const cellsXml = cells.map(buildCellXml).join('\n');

  return [
    `<mxfile host="${escapeXml(host)}">`,
    `  <diagram id="${escapeXml(diagramId)}" name="${escapeXml(diagramName)}">`,
    '    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">',
    '      <root>',
    '        <mxCell id="0" />',
    '        <mxCell id="1" parent="0" />',
    cellsXml,
    '      </root>',
    '    </mxGraphModel>',
    '  </diagram>',
    '</mxfile>'
  ]
    .filter((line) => line !== '')
    .join('\n');
}

module.exports = { buildDrawioXml, escapeXml };
