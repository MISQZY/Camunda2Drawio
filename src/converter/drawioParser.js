const XML_UNESCAPES = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&amp;': '&'
};

function unescapeXml(value) {
  return String(value).replace(/&lt;|&gt;|&quot;|&apos;|&amp;/g, (entity) => XML_UNESCAPES[entity]);
}

function parseAttrs(source) {
  const attrs = {};
  const attrRegex = /([\w:-]+)="([^"]*)"/g;
  let match;
  while ((match = attrRegex.exec(source))) {
    attrs[match[1]] = unescapeXml(match[2]);
  }
  return attrs;
}

// A cell's own <mxGeometry> is either self-closing (a plain box) or wraps
// <mxPoint>/<Array as="points"> children (waypoints, or the fixed
// source/target points of a floating line) - both shapes are parsed here.
function parseGeometry(cellBody) {
  if (!cellBody) {
    return null;
  }
  const geometryMatch = /<mxGeometry\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxGeometry>)/.exec(cellBody);
  if (!geometryMatch) {
    return null;
  }

  const attrs = parseAttrs(geometryMatch[1]);
  const geometry = {};
  if (attrs.x !== undefined) geometry.x = Number(attrs.x);
  if (attrs.y !== undefined) geometry.y = Number(attrs.y);
  if (attrs.width !== undefined) geometry.width = Number(attrs.width);
  if (attrs.height !== undefined) geometry.height = Number(attrs.height);

  const inner = geometryMatch[2] || '';
  const points = [];
  const pointRegex = /<mxPoint\b([^>]*)\/>/g;
  let pointMatch;
  while ((pointMatch = pointRegex.exec(inner))) {
    const pointAttrs = parseAttrs(pointMatch[1]);
    const point = { x: Number(pointAttrs.x), y: Number(pointAttrs.y) };
    if (pointAttrs.as === 'sourcePoint') {
      geometry.sourcePoint = point;
    } else if (pointAttrs.as === 'targetPoint') {
      geometry.targetPoint = point;
    } else {
      points.push(point);
    }
  }
  if (points.length > 0) {
    geometry.points = points;
  }

  return geometry;
}

// A cell with custom data (set via draw.io's "Edit Data", or a hyperlink) is
// wrapped by draw.io as <UserObject id="…" label="…" …><mxCell …>…</mxCell>
// </UserObject> (or the older <object> tag) - the id/display text move onto
// the wrapper, leaving the inner mxCell without its own id or value. Hoist
// them back onto the inner tag before the main cell scan below ever sees it,
// so wrapped cells aren't silently skipped for lacking an id.
function unwrapUserObjects(drawioXml) {
  return drawioXml.replace(
    /<(?:UserObject|object)\b([^>]*)>\s*<mxCell\b([^>]*?)(\/?)>/g,
    (full, outerAttrs, cellAttrs, selfClose) => {
      let injected = '';
      if (!/\bid="/.test(cellAttrs)) {
        const idMatch = /\bid="([^"]*)"/.exec(outerAttrs);
        if (idMatch) injected += ` id="${idMatch[1]}"`;
      }
      if (!/\bvalue="/.test(cellAttrs)) {
        const labelMatch = /\blabel="([^"]*)"/.exec(outerAttrs);
        if (labelMatch) injected += ` value="${labelMatch[1]}"`;
      }
      return `<mxCell${cellAttrs}${injected}${selfClose}>`;
    }
  );
}

// Hand-rolled on purpose, mirroring xmlBuilder.js's own hand-rolled writer:
// draw.io's mxCell/mxGeometry/mxPoint structure is flat and fully known, so a
// small regex-based reader avoids pulling in a DOM/XML parser dependency
// that would otherwise differ between the Jest (Node) and webpack (browser)
// bundles.
function parseDrawioCells(drawioXml) {
  const unwrapped = unwrapUserObjects(drawioXml);
  const cellRegex = /<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g;
  const cells = [];
  let match;
  while ((match = cellRegex.exec(unwrapped))) {
    const attrs = parseAttrs(match[1]);
    if (attrs.id === undefined || attrs.id === '0' || attrs.id === '1') {
      continue;
    }
    cells.push({
      id: attrs.id,
      value: attrs.value || undefined,
      style: attrs.style || '',
      vertex: attrs.vertex === '1',
      edge: attrs.edge === '1',
      parent: attrs.parent,
      source: attrs.source,
      target: attrs.target,
      geometry: parseGeometry(match[2])
    });
  }
  return cells;
}

module.exports = { parseDrawioCells };
