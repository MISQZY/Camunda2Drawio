// draw.io's actual desktop/web app - unlike this plugin's own xmlBuilder.js -
// deflates and base64-encodes each page's <mxGraphModel> XML by default, so a
// genuine hand-authored .drawio file has a <diagram> element whose text node
// is a compressed blob rather than inline XML. This resolves that blob back
// into plain XML before drawioParser.js ever sees it. `DecompressionStream`
// ('deflate-raw') is available in both the Electron/Chromium renderer this
// plugin ships in and in the Node/Jest environment the tests run under, so no
// inflate library dependency is needed.
async function inflateDeflateRawBase64(base64) {
  const binary = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const stream = new Blob([binary]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const buffer = await new Response(stream).arrayBuffer();
  return decodeURIComponent(new TextDecoder().decode(buffer));
}

// Only the first page is imported: this plugin's own export is always a
// single page, and BPMN's own model is a single process/collaboration, so a
// multi-page drawio file has no well-defined mapping onto one BPMN diagram.
function extractFirstDiagramInner(drawioFile) {
  const match = /<diagram\b[^>]*>([\s\S]*?)<\/diagram>/.exec(drawioFile);
  return match ? match[1].trim() : drawioFile.trim();
}

// Resolves a raw .drawio file (as read from disk) into the plain
// <mxGraphModel>...</mxGraphModel> XML that drawioParser.js expects,
// transparently inflating it first if draw.io compressed it.
async function resolveDrawioGraphXml(drawioFile) {
  const inner = extractFirstDiagramInner(drawioFile);
  if (inner.startsWith('<')) {
    return inner;
  }
  return inflateDeflateRawBase64(inner);
}

module.exports = { resolveDrawioGraphXml };
