const { resolveStyle, resolveGeometry } = require('./styleMap');

function vertexMarkerGeometry(width, height, size) {
  return {
    x: Math.round((width - size) / 2),
    y: Math.round((height - size) / 2),
    width: size,
    height: size
  };
}

function fractionalPoint(width, height, [fx, fy]) {
  return { x: Math.round(width * fx), y: Math.round(height * fy) };
}

function buildMarkerCell(descriptor, marker, index) {
  const id = `${descriptor.id}_marker_${index}`;
  const parent = descriptor.id;

  if (marker.type === 'line') {
    const [from, to] = marker.points;
    return {
      id,
      style: marker.style,
      edge: true,
      parent,
      geometry: {
        relative: true,
        sourcePoint: fractionalPoint(descriptor.width, descriptor.height, from),
        targetPoint: fractionalPoint(descriptor.width, descriptor.height, to)
      }
    };
  }

  const size = Math.round(Math.min(descriptor.width, descriptor.height) * (marker.sizeRatio || 0.6));
  return {
    id,
    value: marker.value || '',
    style: marker.style,
    vertex: true,
    parent,
    geometry: vertexMarkerGeometry(descriptor.width, descriptor.height, size)
  };
}

function convertElement(descriptor) {
  const parent = descriptor.parent || '1';
  const { style, markers } = resolveStyle(descriptor);
  const geometryOverride = resolveGeometry(descriptor) || {};

  const mainCell = {
    id: descriptor.id,
    value: descriptor.name || '',
    style,
    vertex: true,
    parent,
    geometry: {
      x: descriptor.x,
      y: descriptor.y,
      width: geometryOverride.width || descriptor.width,
      height: geometryOverride.height || descriptor.height
    }
  };

  const cells = [mainCell];

  (markers || []).forEach((marker, index) => {
    cells.push(buildMarkerCell(descriptor, marker, index));
  });

  return cells;
}

module.exports = { convertElement };
