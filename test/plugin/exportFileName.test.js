const { toExportFileName } = require('../../src/plugin/exportFileName');

describe('toExportFileName', () => {
  it('replaces a .bpmn extension with .drawio', () => {
    expect(toExportFileName('order-process.bpmn')).toBe('order-process.drawio');
  });

  it('is case-insensitive about the .bpmn extension', () => {
    expect(toExportFileName('order-process.BPMN')).toBe('order-process.drawio');
  });

  it('appends .drawio when there is no recognized extension', () => {
    expect(toExportFileName('order-process')).toBe('order-process.drawio');
  });

  it('falls back to a default name when no tab name is given', () => {
    expect(toExportFileName(undefined)).toBe('diagram.drawio');
    expect(toExportFileName('')).toBe('diagram.drawio');
  });
});
