const fs = require('fs');
const path = require('path');
const { convertBpmnToDrawio } = require('../../src/converter/index');

const fixturePath = path.join(__dirname, '..', 'fixtures', 'approval-process.bpmn');
const bpmnXml = fs.readFileSync(fixturePath, 'utf8');

describe('convertBpmnToDrawio', () => {
  it('produces well-formed drawio XML wrapping every BPMN element', async () => {
    const drawioXml = await convertBpmnToDrawio(bpmnXml);

    expect(drawioXml).toContain('<mxfile');
    expect(drawioXml).toContain('<mxGraphModel');

    [
      'StartEvent_1',
      'Task_1',
      'Gateway_1',
      'EndEvent_1',
      'EndEvent_2',
      'TextAnnotation_1',
      'Participant_1',
      'Lane_1',
      'Lane_2',
      'Flow_1',
      'Flow_2',
      'Flow_3',
      'Flow_4',
      'Association_1'
    ].forEach((id) => {
      expect(drawioXml).toContain(`id="${id}"`);
    });
  });

  it('nests lane children under the lane and the lane under the participant', async () => {
    const drawioXml = await convertBpmnToDrawio(bpmnXml);

    expect(drawioXml).toContain('parent="Lane_1"');
    expect(drawioXml).toContain('parent="Lane_2"');
    expect(drawioXml).toContain('parent="Participant_1"');
  });

  it('renders the exclusive gateway using the preconfigured draw.io BPMN gateway shape', async () => {
    const drawioXml = await convertBpmnToDrawio(bpmnXml);

    expect(drawioXml).toContain('shape=mxgraph.bpmn.gateway2;');
    expect(drawioXml).toContain('gwType=exclusive;');
    expect(drawioXml).not.toContain('fillColor=#fff2cc');
  });

  it('marks the conditional flow and the default flow', async () => {
    const drawioXml = await convertBpmnToDrawio(bpmnXml);

    expect(drawioXml).toMatch(/id="Flow_3"[^>]*style="[^"]*startArrow=diamondThin/);
    expect(drawioXml).toMatch(/id="Flow_4"[^>]*style="[^"]*startArrow=dash/);
  });

  it('uses the participant name as the diagram name when no override is given', async () => {
    const drawioXml = await convertBpmnToDrawio(bpmnXml);

    expect(drawioXml).toContain('name="Approval"');
  });

  it('honours an explicit diagramName option', async () => {
    const drawioXml = await convertBpmnToDrawio(bpmnXml, { diagramName: 'Custom Name' });

    expect(drawioXml).toContain('name="Custom Name"');
  });

  it('rejects when the BPMN XML is invalid', async () => {
    await expect(convertBpmnToDrawio('<not-bpmn/>')).rejects.toThrow();
  });
});
