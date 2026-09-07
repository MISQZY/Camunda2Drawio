# camunda-drawio-export

A Camunda Modeler plugin that exports the BPMN diagram open in the editor as a
[draw.io](https://www.drawio.com/) diagram, rendered with BPMN-shaped elements
(events, tasks, gateways, pools/lanes, data objects, flows) instead of a raw
BPMN XML dump.

Built test-first: the conversion engine (`src/converter`) is a set of small,
pure functions covered by unit tests, orchestrated by a thin Camunda Modeler
client plugin (`src/plugin`) that isn't practical to unit test outside a real
Electron/React host, so it stays intentionally small and is exercised manually.

## How it works

```
BPMN 2.0 XML --(bpmn-moddle)--> descriptors --(style map)--> drawio mxCell(s) --(xml builder)--> .drawio XML
```

- `src/converter/styleMap.js` maps each BPMN element/flow type to a draw.io
  style string, using only core draw.io shapes (`ellipse`, `rhombus`,
  `rounded=1` rectangles, `note`, `cylinder3`, `swimlane`) so the output opens
  correctly in any draw.io version without depending on undocumented internal
  stencil names. Gateway markers (`X`, `+`, `O`, `*`, `E`) and collapsed
  sub-process `+` markers are rendered as small child cells.
- `src/converter/diagramConverter.js` parses the BPMN DI (diagram
  interchange) info via [`bpmn-moddle`](https://github.com/bpmn-io/bpmn-moddle),
  resolves each element's container (lane → pool → top level) and converts
  absolute page coordinates into parent-relative coordinates, which is what
  draw.io expects for nested container children.
- `src/converter/elementConverter.js` / `edgeConverter.js` turn one
  descriptor into one or more draw.io `mxCell` objects.
- `src/converter/xmlBuilder.js` serializes the cells into a `.drawio`
  (`mxfile`/`mxGraphModel`) document.
- `src/converter/index.js` (`convertBpmnToDrawio`) wires the above into the
  public API used both by the tests and by the plugin.

## Project layout

```
src/converter/   conversion engine (unit tested)
src/plugin/      Camunda Modeler client plugin
  index.js       plugin manifest (name + script), loaded by Camunda Modeler
  client/        webpack entry bundled into client/dist/client.js
test/converter/  unit + integration tests for the conversion engine
test/plugin/     unit tests for plugin-side pure helpers
test/fixtures/   sample .bpmn files used by the integration tests
```

## Development

```bash
npm install
npm test              # runs the full test suite (jest)
npm run build:plugin  # bundles src/plugin/client into src/plugin/client/dist/client.js
npm run package:plugin # builds, then assembles a ready-to-copy folder in release/camunda-drawio-export
```

Tests were written before their implementation for every unit in
`src/converter` and `src/plugin/exportFileName.js`; each commit in the
history adds one red→green step.

## Installing the plugin in Camunda Modeler

Camunda Modeler discovers plugins as **plain folders** (one folder per
plugin, each containing its own `index.js`) under its plugins directory —
not as `.zip` archives.

1. `npm install && npm run package:plugin`
   This produces a self-contained folder at
   `release/camunda-drawio-export/` (just `index.js` + the bundled
   `client.js`, no source/dev files).
2. Copy that folder as-is into Camunda Modeler's plugins directory:
   - Windows: `%APPDATA%\camunda-modeler\resources\plugins\`
   - macOS: `~/Library/Application Support/camunda-modeler/resources/plugins/`
   - Linux: `~/.config/camunda-modeler/resources/plugins/`

   So you end up with e.g.
   `%APPDATA%\camunda-modeler\resources\plugins\camunda-drawio-export\index.js`.
3. Restart Camunda Modeler. Open a BPMN diagram — a **draw.io** button
   appears in the toolbar. Clicking it downloads a `<diagram-name>.drawio`
   file that can be opened directly in draw.io / diagrams.net.

Re-run `npm run package:plugin` and re-copy the folder whenever the plugin
source changes.

## Notes / limitations

- The plugin downloads the exported file via the browser's standard
  `Blob` + `<a download>` mechanism rather than Camunda Modeler's native save
  dialog: the internal `fileSystem.writeFile` API is not reliably usable from
  a client plugin (confirmed on the Camunda forum), while the download
  approach works consistently across Modeler versions.
- Event and task sub-type markers (message/timer/error start events,
  user/service/manual tasks, etc.) are tagged on the style
  (`bpmnEventDefinition=...;`, `bpmnElement=bpmn:UserTask;`) for traceability
  but currently share one visual shape per BPMN category (ellipse for events,
  rounded rectangle for tasks); dedicated per-marker icons are not drawn.
