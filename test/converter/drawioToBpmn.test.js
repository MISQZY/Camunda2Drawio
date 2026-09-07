const fs = require('fs');
const path = require('path');
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
