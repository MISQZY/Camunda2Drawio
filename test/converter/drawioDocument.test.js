const zlib = require('zlib');
const { resolveDrawioGraphXml } = require('../../src/converter/drawioDocument');

const GRAPH_XML = '<mxGraphModel><root><mxCell id="0" /><mxCell id="1" parent="0" /><mxCell id="A" value="Task" style="rounded=0;" vertex="1" parent="1"><mxGeometry x="1" y="2" width="3" height="4" as="geometry" /></mxCell></root></mxGraphModel>';

function deflateRawBase64(xml) {
  return zlib.deflateRawSync(Buffer.from(encodeURIComponent(xml), 'utf8')).toString('base64');
}

describe('resolveDrawioGraphXml', () => {
  it('passes inline (uncompressed) diagram XML through unchanged', async () => {
    const file = `<mxfile><diagram id="d1" name="Page-1">${GRAPH_XML}</diagram></mxfile>`;
    const resolved = await resolveDrawioGraphXml(file);
    expect(resolved).toBe(GRAPH_XML);
  });

  it('inflates a draw.io-compressed diagram (base64 + raw deflate) back to plain XML', async () => {
    const file = `<mxfile host="app.diagrams.net"><diagram id="d1" name="Page-1">${deflateRawBase64(GRAPH_XML)}</diagram></mxfile>`;
    const resolved = await resolveDrawioGraphXml(file);
    expect(resolved).toBe(GRAPH_XML);
  });

  it('imports only the first page of a multi-page file', async () => {
    const otherPage = GRAPH_XML.replace('id="A"', 'id="B"');
    const file = `<mxfile><diagram id="d1" name="Page-1">${GRAPH_XML}</diagram><diagram id="d2" name="Page-2">${otherPage}</diagram></mxfile>`;
    const resolved = await resolveDrawioGraphXml(file);
    expect(resolved).toBe(GRAPH_XML);
  });

  it('treats a bare mxGraphModel with no mxfile/diagram wrapper as already-resolved XML', async () => {
    const resolved = await resolveDrawioGraphXml(GRAPH_XML);
    expect(resolved).toBe(GRAPH_XML);
  });
});
