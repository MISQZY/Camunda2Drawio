const { resolveStyle } = require('./styleMap');

const MARKER_SIZE = 20;

function markerGeometry(width, height, size) {
  return {
    x: Math.round((width - size) / 2),
    y: Math.round((height - size) / 2),
    width: size,
    height: size
  };
}

function convertElement(descriptor) {
  const parent = descriptor.parent || '1';
  const { style, markerGlyph } = resolveStyle(descriptor);

  const mainCell = {
    id: descriptor.id,
    value: descriptor.name || '',
    style,
    vertex: true,
    parent,
    geometry: {
      x: descriptor.x,
      y: descriptor.y,
      width: descriptor.width,
      height: descriptor.height
    }
  };

  const cells = [mainCell];

  if (markerGlyph) {
    const gatewayMarkerSize = Math.round(Math.min(descriptor.width, descriptor.height) * 0.6);
    cells.push({
      id: `${descriptor.id}_marker`,
      value: markerGlyph,
      style: 'text;html=1;align=center;verticalAlign=middle;fontSize=20;fontStyle=1;',
      vertex: true,
      parent: descriptor.id,
      geometry: markerGeometry(descriptor.width, descriptor.height, gatewayMarkerSize)
    });
  }

  if (descriptor.type === 'bpmn:SubProcess' && descriptor.isExpanded === false) {
    cells.push({
      id: `${descriptor.id}_marker`,
      value: '+',
      style: 'text;html=1;align=center;verticalAlign=middle;fontSize=16;fontStyle=1;',
      vertex: true,
      parent: descriptor.id,
      geometry: {
        x: Math.round((descriptor.width - MARKER_SIZE) / 2),
        y: descriptor.height - MARKER_SIZE,
        width: MARKER_SIZE,
        height: MARKER_SIZE
      }
    });
  }

  return cells;
}

module.exports = { convertElement };
