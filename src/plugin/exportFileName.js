function toExportFileName(tabName) {
  if (!tabName) {
    return 'diagram.drawio';
  }

  const base = tabName.replace(/\.bpmn$/i, '');
  return `${base}.drawio`;
}

module.exports = { toExportFileName };
