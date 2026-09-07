const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const BpmnModdle = require('bpmn-moddle');
const { convertBpmnToDrawio, convertDrawioToBpmn } = require('../../src/converter/index');

async function roundTrip(fixtureName) {
  const fixturePath = path.join(__dirname, '..', 'fixtures', fixtureName);
  const bpmnXml = fs.readFileSync(fixturePath, 'utf8');
  const drawioXml = await convertBpmnToDrawio(bpmnXml);
  const roundTrippedXml = await convertDrawioToBpmn(drawioXml);
  const { rootElement: definitions } = await new BpmnModdle().fromXML(roundTrippedXml);
  return { drawioXml, roundTrippedXml, definitions };
}

function findRootElement(definitions, type, id) {
  return (definitions.rootElements || []).find((el) => el.$type === type && (!id || el.id === id));
}

function collectFlowElements(container) {
  return container.flowElements || [];
}

describe('convertDrawioToBpmn (approval-process fixture)', () => {
  it('produces a minimal valid empty process when the drawio XML has no recognizable cells', async () => {
    const bpmnXml = await convertDrawioToBpmn('<mxfile><diagram><mxGraphModel><root /></mxGraphModel></diagram></mxfile>');
    expect(bpmnXml).toContain('<bpmn:process');
  });

  it('imports a real (not this plugin\'s own export) draw.io file: compressed diagram + a UserObject-wrapped task', async () => {
    const graphXml = `<mxGraphModel><root>
      <mxCell id="0" />
      <mxCell id="1" parent="0" />
      <UserObject id="Task_1" label="Ship it" link="https://example.com">
        <mxCell style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="120" height="60" as="geometry" />
        </mxCell>
      </UserObject>
      <mxCell id="Task_2" value="Follow up" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="1">
        <mxGeometry x="300" y="200" width="120" height="60" as="geometry" />
      </mxCell>
      <mxCell id="Flow_1" style="edgeStyle=orthogonalEdgeStyle;html=1;" edge="1" parent="1" source="Task_1" target="Task_2">
        <mxGeometry relative="1" as="geometry" />
      </mxCell>
    </root></mxGraphModel>`;
    const compressed = zlib.deflateRawSync(Buffer.from(encodeURIComponent(graphXml), 'utf8')).toString('base64');
    const realDrawioFile = `<mxfile host="app.diagrams.net"><diagram id="abc" name="Page-1">${compressed}</diagram></mxfile>`;

    const bpmnXml = await convertDrawioToBpmn(realDrawioFile);
    const { rootElement: definitions } = await new BpmnModdle().fromXML(bpmnXml);
    const process = findRootElement(definitions, 'bpmn:Process');

    const task1 = collectFlowElements(process).find((el) => el.id === 'Task_1');
    expect(task1.name).toBe('Ship it');
    expect(collectFlowElements(process).map((el) => el.id)).toEqual(expect.arrayContaining(['Task_1', 'Task_2', 'Flow_1']));
  });

  it('imports a hand-drawn pool with lanes at the real draw.io startSize (20) and a Ctrl+G-grouped task', async () => {
    // Mirrors the shape of a genuine draw.io BPMN example diagram: a pool
    // and its lane share the same startSize (this plugin's own export is
    // the only thing that ever writes startSize=30 for a pool), and one
    // task sits inside a plain selection group together with its boundary
    // events, the way Ctrl+G leaves them.
    const graphXml = `<mxGraphModel><root>
      <mxCell id="0" />
      <mxCell id="1" parent="0" />
      <mxCell id="Pool" value="Items'R'us" style="swimlane;horizontal=0;startSize=20;" vertex="1" parent="1">
        <mxGeometry x="0" y="0" width="600" height="200" as="geometry" />
      </mxCell>
      <mxCell id="Lane" value="Purchasing" style="swimlane;horizontal=0;startSize=20;" vertex="1" parent="Pool">
        <mxGeometry x="20" y="0" width="580" height="200" as="geometry" />
      </mxCell>
      <UserObject label="" id="Grp">
        <mxCell style="group" vertex="1" connectable="0" parent="Lane">
          <mxGeometry x="100" y="40" width="140" height="100" as="geometry" />
        </mxCell>
      </UserObject>
      <mxCell id="Procure" value="Procure items" style="shape=mxgraph.bpmn.task2;taskMarker=abstract;" vertex="1" parent="Grp">
        <mxGeometry x="0" y="0" width="130" height="90" as="geometry" />
      </mxCell>
      <mxCell id="ErrorEvent" style="shape=mxgraph.bpmn.event;outline=boundInt;symbol=error;" vertex="1" parent="Grp">
        <mxGeometry x="90" y="70" width="30" height="30" as="geometry" />
      </mxCell>
    </root></mxGraphModel>`;

    const bpmnXml = await convertDrawioToBpmn(`<mxfile><diagram id="d1">${graphXml}</diagram></mxfile>`);
    const { rootElement: definitions } = await new BpmnModdle().fromXML(bpmnXml);

    const collaboration = findRootElement(definitions, 'bpmn:Collaboration');
    expect(collaboration.participants).toHaveLength(1);
    expect(collaboration.participants[0].name).toBe("Items'R'us");

    const process = findRootElement(definitions, 'bpmn:Process');
    expect(process.laneSets[0].lanes.map((lane) => lane.name)).toEqual(['Purchasing']);
    expect(process.laneSets[0].lanes[0].flowNodeRef.map((ref) => ref.id)).toEqual(
      expect.arrayContaining(['Procure', 'ErrorEvent'])
    );

    const task = collectFlowElements(process).find((el) => el.id === 'Procure');
    expect(task.$type).toBe('bpmn:Task');
    const boundaryEvent = collectFlowElements(process).find((el) => el.id === 'ErrorEvent');
    expect(boundaryEvent.attachedToRef.id).toBe('Procure');
    expect(collectFlowElements(process).some((el) => el.id === 'Grp')).toBe(false);
  });

  it('rebuilds the collaboration with both lanes and every flow node', async () => {
    const { definitions } = await roundTrip('approval-process.bpmn');

    const collaboration = findRootElement(definitions, 'bpmn:Collaboration');
    expect(collaboration).toBeDefined();
    expect(collaboration.participants).toHaveLength(1);
    expect(collaboration.participants[0].name).toBe('Approval');

    const process = findRootElement(definitions, 'bpmn:Process');
    const ids = collectFlowElements(process).map((el) => el.id);
    ['StartEvent_1', 'Task_1', 'Gateway_1', 'EndEvent_1', 'EndEvent_2', 'Flow_1', 'Flow_2', 'Flow_3', 'Flow_4'].forEach((id) => {
      expect(ids).toContain(id);
    });

    const lanes = process.laneSets[0].lanes;
    expect(lanes.map((lane) => lane.name)).toEqual(['Reviewer', 'Manager']);
    expect(lanes[0].flowNodeRef.map((ref) => ref.id)).toEqual(['StartEvent_1', 'Task_1', 'Gateway_1']);
    expect(lanes[1].flowNodeRef.map((ref) => ref.id)).toEqual(['EndEvent_1', 'EndEvent_2']);
  });

  it('preserves the user task type and the exclusive gateway default flow', async () => {
    const { definitions } = await roundTrip('approval-process.bpmn');
    const process = findRootElement(definitions, 'bpmn:Process');

    const task = collectFlowElements(process).find((el) => el.id === 'Task_1');
    expect(task.$type).toBe('bpmn:UserTask');

    const gateway = collectFlowElements(process).find((el) => el.id === 'Gateway_1');
    expect(gateway.default.id).toBe('Flow_4');
  });

  it('marks the conditional flow with a (placeholder) condition expression', async () => {
    const { definitions } = await roundTrip('approval-process.bpmn');
    const process = findRootElement(definitions, 'bpmn:Process');

    const conditional = collectFlowElements(process).find((el) => el.id === 'Flow_3');
    expect(conditional.conditionExpression).toBeDefined();
  });

  it('keeps the text annotation and its association wired to the task', async () => {
    const { definitions } = await roundTrip('approval-process.bpmn');
    const collaboration = findRootElement(definitions, 'bpmn:Collaboration');

    const annotation = collaboration.artifacts.find((el) => el.$type === 'bpmn:TextAnnotation');
    expect(annotation.text).toBe('Escalate after 2 days');

    const association = collaboration.artifacts.find((el) => el.$type === 'bpmn:Association');
    expect(association.sourceRef.id).toBe('Task_1');
    expect(association.targetRef.id).toBe(annotation.id);
  });
});

describe('convertDrawioToBpmn (advanced-process fixture)', () => {
  it('splits the two pools into two separate processes joined by a message flow', async () => {
    const { definitions } = await roundTrip('advanced-process.bpmn');
    const collaboration = findRootElement(definitions, 'bpmn:Collaboration');

    expect(collaboration.participants).toHaveLength(2);
    expect(collaboration.messageFlows).toHaveLength(1);
    expect(collaboration.messageFlows[0].sourceRef.id).toBe('Task_A1');
    expect(collaboration.messageFlows[0].targetRef.id).toBe('SubProcess_1');
  });

  it('nests the sub-process children under the sub-process, not the top-level process', async () => {
    const { definitions } = await roundTrip('advanced-process.bpmn');
    const processB = findRootElement(definitions, 'bpmn:Process', 'Participant_B_process') || definitions.rootElements.find(
      (el) => el.$type === 'bpmn:Process' && collectFlowElements(el).some((child) => child.id === 'SubProcess_1')
    );

    const subProcess = collectFlowElements(processB).find((el) => el.id === 'SubProcess_1');
    expect(subProcess.$type).toBe('bpmn:SubProcess');

    const innerIds = collectFlowElements(subProcess).map((el) => el.id);
    expect(innerIds).toEqual(expect.arrayContaining(['StartEvent_B', 'Task_B1', 'EndEvent_B', 'BoundaryEvent_1', 'Flow_Inner1', 'Flow_Inner2']));

    const topLevelIds = collectFlowElements(processB).map((el) => el.id);
    expect(topLevelIds).not.toContain('Task_B1');
  });

  it('infers the boundary event host from geometry and preserves non-interrupting + timer definition', async () => {
    const { definitions } = await roundTrip('advanced-process.bpmn');
    const processB = definitions.rootElements.find(
      (el) => el.$type === 'bpmn:Process' && collectFlowElements(el).some((child) => child.id === 'SubProcess_1')
    );
    const subProcess = collectFlowElements(processB).find((el) => el.id === 'SubProcess_1');
    const boundaryEvent = collectFlowElements(subProcess).find((el) => el.id === 'BoundaryEvent_1');

    expect(boundaryEvent.attachedToRef.id).toBe('Task_B1');
    expect(boundaryEvent.cancelActivity).toBe(false);
    expect(boundaryEvent.eventDefinitions[0].$type).toBe('bpmn:TimerEventDefinition');
  });

  it('preserves the call activity, parallel gateway, data object/store and group', async () => {
    const { definitions } = await roundTrip('advanced-process.bpmn');
    const allFlowElements = definitions.rootElements
      .filter((el) => el.$type === 'bpmn:Process')
      .flatMap((process) => collectFlowElements(process));

    expect(allFlowElements.find((el) => el.id === 'CallActivity_A1').$type).toBe('bpmn:CallActivity');
    expect(allFlowElements.find((el) => el.id === 'Gateway_P1').$type).toBe('bpmn:ParallelGateway');
    expect(allFlowElements.find((el) => el.id === 'DataObject_1').$type).toBe('bpmn:DataObjectReference');
    expect(allFlowElements.find((el) => el.id === 'DataStore_1').$type).toBe('bpmn:DataStoreReference');

    const collaboration = findRootElement(definitions, 'bpmn:Collaboration');
    expect(collaboration.artifacts.find((el) => el.$type === 'bpmn:Group')).toBeDefined();
  });
});
