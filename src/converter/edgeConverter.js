const { resolveStyle } = require('./styleMap');

function convertFlow(descriptor) {
  const parent = descriptor.parent || '1';
  const { style } = resolveStyle(descriptor);
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
