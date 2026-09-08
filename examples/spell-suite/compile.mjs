import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spellAutomationSpecs} from '@arcanedesk/spells-2014';
import {compileSpellPlan} from '@arcanedesk/spell-compiler';
import {bindSpellContent} from '@arcanedesk/spells-2014/binding';
import {describeSpellRequirements} from '@arcanedesk/automation-contracts/requirements';

const [selection, output, ...extra] = process.argv.slice(2);
if (!selection || !output || extra.length || (selection !== '--all' && !Object.hasOwn(spellAutomationSpecs, selection))) {
  throw new Error('Usage: node examples/spell-suite/compile.mjs <spell-id|--all> <new-output.json>');
}
const definitions = selection === '--all' ? Object.values(spellAutomationSpecs) : [spellAutomationSpecs[selection]];
const results = definitions.map(definition => {
  const plan = compileSpellPlan(definition);
  const source = {_id: 'originalInput001', name: 'Original demonstration spell', type: 'spell',
    img: 'icons/svg/book.svg', system: {identifier: definition.id, level: definition.contract.level,
      source: {rules: '2014'}, description: {value: '<p>Original demonstration text. This is not a rule description.</p>', chat: ''}}};
  const before = structuredClone(source);
  const binding = bindSpellContent({source, plan, target: {_id: 'originalSpell001'},
    bindings: {documentUuid: 'Compendium.world.original_demo.Item.originalSpell001', summonProfiles: {}}});
  assert.deepEqual(source, before);
  if (binding.status === 'bound') assert.deepEqual(binding.item.system.description, source.system.description);
  else assert.equal(binding.status, 'unbound');
  return {id: definition.id, level: definition.contract.level, support: definition.support,
    plan, requirements: describeSpellRequirements(plan), binding};
});
const target = path.resolve(output);
await fs.mkdir(path.dirname(target), {recursive: true});
// Examples never silently replace an earlier result or user content.
await fs.writeFile(target, JSON.stringify({schemaVersion: 1, fixture: 'original-demonstration', results}, null, 2) + '\n', {flag: 'wx'});
console.log(JSON.stringify({compiled: results.length, bound: results.filter(result => result.binding.status === 'bound').length,
  unbound: results.filter(result => result.binding.status === 'unbound').map(result => result.id),
  output: target, realFoundryWorld: false}));
