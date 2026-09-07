const { resolveStyle } = require('./styleMap');

function fixedPointStyle(prefix, point) {
  if (!point) {
    return '';
  }
  return `${prefix}X=${point.x};${prefix}Y=${point.y};${prefix}Dx=0;${prefix}Dy=0;`;
}

function convertFlow(descriptor) {
  const parent = descriptor.parent || '1';
  const { style: baseStyle } = resolveStyle(descriptor);
  const style = baseStyle + fixedPointStyle('exit', descriptor.exitPoint) + fixedPointStyle('entry', descriptor.entryPoint);
  const waypoints = descriptor.waypoints || [];
  const interiorPoints = waypoints.length > 2 ? waypoints.slice(1, -1) : undefined;

  const geometry = { relative: true };
  if (interiorPoints) {
    geometry.points = interiorPoints;
  }

  return [
    {
      id: descriptor.id,
      value: descriptor.name || '',
      style,
      edge: true,
      parent,
      source: descriptor.sourceId,
      target: descriptor.targetId,
      geometry
    }
  ];
}

module.exports = { convertFlow };
