const { parseDrawioCells } = require('./drawioParser');
const { parseStyleTokens, classifyVertexStyle, classifyEdgeStyle } = require('./reverseStyleMap');

const ACTIVITY_TYPES = new Set([
  'bpmn:Task',
  'bpmn:UserTask',
  'bpmn:ServiceTask',
  'bpmn:ScriptTask',
  'bpmn:ManualTask',
  'bpmn:BusinessRuleTask',
  'bpmn:SendTask',
  'bpmn:ReceiveTask',
  'bpmn:CallActivity',
  'bpmn:SubProcess'
]);

function round(value) {
  return Math.round(value);
}

// draw.io geometry is parent-relative (mirrors diagramConverter.js's own
// normalizeToParentRelativeCoordinates, in reverse): walk each node's own
// parent chain back up to the page root, accumulating offsets.
function computeAbsoluteBounds(nodes) {
  const cache = new Map();

  function resolve(id) {
    if (cache.has(id)) {
      return cache.get(id);
    }
    const node = nodes.get(id);
    if (!node) {
      return null;
    }
    let bounds;
    if (!node.containerId || node.containerId === '1') {
      bounds = { x: node.x, y: node.y, width: node.width, height: node.height };
    } else {
      const parentBounds = resolve(node.containerId);
      bounds = parentBounds
        ? { x: node.x + parentBounds.x, y: node.y + parentBounds.y, width: node.width, height: node.height }
        : { x: node.x, y: node.y, width: node.width, height: node.height };
    }
    cache.set(id, bounds);
    return bounds;
  }

  nodes.forEach((node) => {
    node.absoluteBounds = resolve(node.id);
  });

  return cache;
}

// A boundary event's host is never recorded in the drawio cell itself (the
// forward converter never wrote one - see diagramConverter.js's node
// descriptor) - so it has to be inferred from geometry, the same way a
// person reads the diagram: whichever activity's border the event sits
// closest to.
function resolveBoundaryEventHost(node, nodes) {
  const bb = node.absoluteBounds;
  const cx = bb.x + bb.width / 2;
  const cy = bb.y + bb.height / 2;

  let best;
  let bestDistance = Infinity;
  let bestArea = Infinity;

  nodes.forEach((candidate) => {
    if (candidate.id === node.id || !ACTIVITY_TYPES.has(candidate.type)) {
      return;
    }
    const cb = candidate.absoluteBounds;
    if (!cb) {
      return;
    }
    const dx = Math.max(cb.x - cx, 0, cx - (cb.x + cb.width));
    const dy = Math.max(cb.y - cy, 0, cy - (cb.y + cb.height));
    const distance = Math.hypot(dx, dy);
    const area = cb.width * cb.height;
    // A boundary event's center often sits inside more than one container at
    // once (its own host task AND that task's ancestor sub-process both have
    // distance 0) - prefer the smallest (innermost) one on a tie, since
    // that's always the actual host, never an ancestor.
    if (distance < bestDistance || (distance === bestDistance && area < bestArea)) {
      bestDistance = distance;
      bestArea = area;
      best = candidate;
    }
  });

  return best ? best.id : undefined;
}

// A hand-drawn edge dragged from one shape to another without dropping it on
// a specific connection point (the common case - fixed exit/entry points are
// only baked in when a diagram was exported by this same plugin, see
// edgeConverter.js) carries no exitX/exitY/entryX/entryY at all. draw.io
// itself then renders it as a straight "floating" connector between the two
// shapes' borders: the point where the line between their centers crosses
// each shape's own bounding box. Without this, such an edge has no waypoint
// to fall back to except a shape's corner, collapsing every unfixed
// connection in the diagram onto a single degenerate point.
function pointOnBoundaryTowards(bounds, otherBounds) {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const dx = otherBounds.x + otherBounds.width / 2 - cx;
  const dy = otherBounds.y + otherBounds.height / 2 - cy;
  if (dx === 0 && dy === 0) {
    return { x: round(cx), y: round(cy) };
  }
  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;
  const timeToVerticalEdge = dx !== 0 ? halfWidth / Math.abs(dx) : Infinity;
  const timeToHorizontalEdge = dy !== 0 ? halfHeight / Math.abs(dy) : Infinity;
  const t = Math.min(timeToVerticalEdge, timeToHorizontalEdge);
  return { x: round(cx + dx * t), y: round(cy + dy * t) };
}

// A plain draw.io "group" cell (reverseStyleMap.js's '__drawio:Group') is a
// transparent grouping box, not a BPMN element - it never becomes a shape in
// the output. Its children are re-parented to whatever real container the
// group itself sat in (so a lane's flowNodeRefs, sub-process nesting etc.
// still resolve correctly), and the group nodes are then discarded. Nested
// groups are collapsed all the way to the first non-group ancestor.
function flattenPlainGroups(nodes, edges) {
  const groupIds = new Set([...nodes.values()].filter((node) => node.type === '__drawio:Group').map((node) => node.id));
  if (groupIds.size === 0) {
    return;
  }

  function resolveThroughGroups(containerId) {
    let current = containerId;
    while (current && groupIds.has(current)) {
      current = nodes.get(current).containerId;
    }
    return current;
  }

  nodes.forEach((node) => {
    if (!groupIds.has(node.id) && groupIds.has(node.containerId)) {
      node.containerId = resolveThroughGroups(node.containerId);
    }
  });
  edges.forEach((edge) => {
    if (groupIds.has(edge.containerId)) {
      edge.containerId = resolveThroughGroups(edge.containerId);
    }
  });
  groupIds.forEach((id) => nodes.delete(id));
}

// The counterpart to edgeConverter.js's exitPoint/entryPoint fractions
// (baked into the style as exitX/exitY/entryX/entryY) and its relative
// interior "points" array: this recomputes the original absolute waypoint
// list from both.
function resolveWaypoints(edge, absoluteBoundsCache) {
  const originId = edge.containerId && edge.containerId !== '1' ? edge.containerId : null;
  const origin = originId ? absoluteBoundsCache.get(originId) : null;

  const interior = ((edge.geometry && edge.geometry.points) || []).map((point) => ({
    x: point.x + (origin ? origin.x : 0),
    y: point.y + (origin ? origin.y : 0)
  }));

  const sourceBounds = absoluteBoundsCache.get(edge.sourceId);
  const targetBounds = absoluteBoundsCache.get(edge.targetId);

  const exitX = edge.tokens.exitX !== undefined ? Number(edge.tokens.exitX) : null;
  const exitY = edge.tokens.exitY !== undefined ? Number(edge.tokens.exitY) : null;
  const entryX = edge.tokens.entryX !== undefined ? Number(edge.tokens.entryX) : null;
  const entryY = edge.tokens.entryY !== undefined ? Number(edge.tokens.entryY) : null;

  const firstPoint =
    sourceBounds && exitX !== null
      ? { x: round(sourceBounds.x + exitX * sourceBounds.width), y: round(sourceBounds.y + exitY * sourceBounds.height) }
      : interior[0] ||
        (sourceBounds && targetBounds
          ? pointOnBoundaryTowards(sourceBounds, targetBounds)
          : targetBounds
            ? { x: targetBounds.x, y: targetBounds.y }
            : { x: 0, y: 0 });

  const lastPoint =
    targetBounds && entryX !== null
      ? { x: round(targetBounds.x + entryX * targetBounds.width), y: round(targetBounds.y + entryY * targetBounds.height) }
      : interior[interior.length - 1] ||
        (sourceBounds && targetBounds ? pointOnBoundaryTowards(targetBounds, sourceBounds) : firstPoint);

  return [firstPoint, ...interior, lastPoint];
}

function buildDrawioModel(drawioXml) {
  const rawCells = parseDrawioCells(drawioXml);
  const edgeIds = new Set(rawCells.filter((cell) => cell.edge).map((cell) => cell.id));
  const swimlaneIds = new Set(
    rawCells.filter((cell) => cell.vertex && parseStyleTokens(cell.style).swimlane === true).map((cell) => cell.id)
  );

  const nodes = new Map();
  const edges = [];

  rawCells.forEach((cell) => {
    // A vertex whose parent is an edge, not a shape, is draw.io's own label
    // or icon riding along that connector (its "Edit Label"/message-icon
    // decoration) - never an independent BPMN flow node.
    if (cell.vertex && edgeIds.has(cell.parent)) {
      return;
    }

    const tokens = parseStyleTokens(cell.style);

    if (cell.edge) {
      const info = classifyEdgeStyle(tokens);
      edges.push({
        kind: 'edge',
        id: cell.id,
        type: info.type,
        name: cell.value,
        sourceId: cell.source,
        targetId: cell.target,
        containerId: cell.parent,
        hasCondition: info.hasCondition,
        isDefault: info.isDefault,
        associationDirection: info.associationDirection,
        tokens,
        geometry: cell.geometry
      });
      return;
    }

    if (!cell.vertex) {
      return;
    }

    const info = classifyVertexStyle(tokens, { isNestedSwimlane: swimlaneIds.has(cell.parent) });
    const geometry = cell.geometry || {};
    nodes.set(cell.id, {
      kind: 'node',
      id: cell.id,
      type: info.type,
      name: cell.value,
      x: geometry.x || 0,
      y: geometry.y || 0,
      width: geometry.width || 0,
      height: geometry.height || 0,
      containerId: cell.parent,
      eventDefinitionType: info.eventDefinitionType,
      isInterrupting: info.isInterrupting,
      isExpanded: info.isExpanded
    });
  });

  const absoluteBoundsCache = computeAbsoluteBounds(nodes);
  flattenPlainGroups(nodes, edges);

  nodes.forEach((node) => {
    if (node.type === 'bpmn:BoundaryEvent') {
      node.attachedToId = resolveBoundaryEventHost(node, nodes);
    }
  });

  edges.forEach((edge) => {
    edge.waypoints = resolveWaypoints(edge, absoluteBoundsCache);
  });

  return { nodes, edges };
}

module.exports = { buildDrawioModel };
