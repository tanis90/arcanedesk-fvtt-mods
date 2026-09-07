export function originalDocumentBindings() {
  return {
    replacements: [
      {kind: 'literal', from: 'modules/original-source/', to: 'modules/{{moduleId}}/'},
      {kind: 'literal', from: 'Compendium.original-source.entries.', to: 'Compendium.{{moduleId}}.features.'},
      {kind: 'regex', pattern: '@UUID\\[unavailable\\]\\{([^}]+)\\}', flags: 'g', to: '$1'}
    ],
    packAliases: [['.entries.', 'features'], ['.practice.', 'spells']],
    metadata: {coreVersion: 'original-core', systemId: 'original-system', systemVersion: 'original-version', lastModifiedBy: null},
    sourceNamespace: 'original-source'
  };
}
