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
  style string, sourced entirely from draw.io's own "BPMN 2.0" shape library
  (shape search "bpmn" -> "BPMN 2.0 \ General/Tasks/Events/Gateways"; the
  same shapes ship in every draw.io build, nothing is a separately-installed
  library). Tasks and sub-processes use `shape=mxgraph.bpmn.task2`, whose own
  `taskMarker` key draws the per-type icon (user/service/send/receive/
  manual/business rule/script) and whose own `isLoopSub` key draws the
  collapsed "+" marker natively - no hand-drawn child cells. Events use
  `shape=mxgraph.bpmn.event` and gateways use `shape=mxgraph.bpmn.gateway2`,
  both driven purely by their own `outline`/`symbol`/`gwType` style keys
  (event border weight/doubling, gateway X/+/asterisk markers, or a plain
  outline circle for inclusive/event-based gateways, which draw.io's own
  library has no dedicated marker for either). Data objects/stores use
  `mxgraph.bpmn.data2`/`datastore`, pools/lanes use the plain `swimlane`
  primitive, and sequence/message/association flows use the library's own
  `elbowEdgeStyle` + `blockThin`/`openThin` arrow styles.
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
index.js         root plugin manifest - lets the whole downloaded repo
                  folder be dropped straight into Camunda's plugins dir
src/converter/    conversion engine (unit tested)
src/plugin/       Camunda Modeler client plugin
  index.js        plugin manifest for the slim release/ build (see below)
  client/         webpack entry bundled into client/dist/client.js
test/converter/   unit + integration tests for the conversion engine
test/plugin/      unit tests for plugin-side pure helpers
test/fixtures/    sample .bpmn files used by the integration tests
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

`src/plugin/client/dist/client.js` is committed (unlike a typical build
output) so the root `index.js` manifest works straight out of a GitHub ZIP
download with no build step. Run `npm run build:plugin` and commit the
result whenever plugin source under `src/` changes.

## Installing the plugin in Camunda Modeler

Camunda Modeler discovers plugins as **plain folders** (one folder per
plugin, each containing its own `index.js`) under its plugins directory —
not as `.zip` archives.

### Quick start (no Node.js required)

1. On this repo's GitHub page, click **Code → Download ZIP**, then extract
   it. The root `index.js` in the extracted folder is a ready-to-use plugin
   manifest — the committed `src/plugin/client/dist/client.js` bundle means
   no build step is needed.
2. Rename the extracted folder to `camunda-drawio-export` (GitHub names it
   `Camunda2Drawio-main`) and move it into Camunda Modeler's plugins
   directory:
   - Windows: `%APPDATA%\camunda-modeler\resources\plugins\`
   - macOS: `~/Library/Application Support/camunda-modeler/resources/plugins/`
   - Linux: `~/.config/camunda-modeler/resources/plugins/`

   So you end up with e.g.
   `%APPDATA%\camunda-modeler\resources\plugins\camunda-drawio-export\index.js`.
3. Restart Camunda Modeler. Open a BPMN diagram and go to
   **Plugins → Draw.io → Export as Draw.io**. Camunda
   Modeler's plugin API has no way for a third-party plugin to add an entry
   to the native **File → Export As** submenu — plugin menu contributions
   only ever land under the top-level **Plugins** menu — so that's the
   closest equivalent to a native menu item. Clicking it downloads a
   `<diagram-name>.drawio` file that can be opened directly in draw.io /
   diagrams.net.

### From source (for development)

`npm install && npm run package:plugin` builds the client bundle and
assembles a slim, source-free copy of the plugin at
`release/camunda-drawio-export/` (`index.js`, `menu/menu.js` and the bundled
`client.js` only). Copy that folder into the plugins directory instead of
the whole repo, then repeat step 3 above. Re-run this command and re-copy
the folder whenever the plugin source changes.

## Notes / limitations

- The plugin downloads the exported file via the browser's standard
  `Blob` + `<a download>` mechanism rather than Camunda Modeler's native save
  dialog: the internal `fileSystem.writeFile` API is not reliably usable from
  a client plugin (confirmed on the Camunda forum), while the download
  approach works consistently across Modeler versions.
- The "Export as draw.io diagram" entry lives under the **Plugins** menu
  (`src/plugin/menu/menu.js`, an app-level menu plugin that emits
  `electronApp.emit('menu:action', 'exportDrawio')`) rather than a status-bar
  button. It's wired to a bpmn-js `editorActions` entry registered in
  `src/plugin/client/DrawioExportEditorAction.js`, since main-process menu
  code has no direct access to the renderer-side modeler.
