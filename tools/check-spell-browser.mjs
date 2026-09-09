import {fileURLToPath} from "node:url";
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
import {compileSpellPlan} from '@arcanedesk/spell-compiler';
import {stableFoundryId} from '@arcanedesk/spell-compiler/emitter';
import {describeSpellRequirements} from '@arcanedesk/automation-contracts/requirements';
import {spellAutomationSpecs} from '@arcanedesk/spells-2014';

const bundled = await build({entryPoints: [fileURLToPath(new URL('../packages/spells-2014/src/bind-content.mjs', import.meta.url))],
  bundle: true, platform: 'browser', format: 'iife', globalName: 'ArcaneBinding',
  write: false, metafile: true, logLevel: 'silent'});
assert(!Object.keys(bundled.metafile.inputs).some(path => path.endsWith('/spell-automation-compiler.mjs')),
  'Browser binding must not load the DSL compiler');
assert(!Object.keys(bundled.metafile.inputs).some(path => path.includes('auto2014-catalogue')),
  'Browser binding must not load the source catalogue');
const context = vm.createContext({TextEncoder, TextDecoder, structuredClone});
new vm.Script(bundled.outputFiles[0].text).runInContext(context);
const {bindSpellContent} = context.ArcaneBinding;
let spells = 0, missingResources = 0;
for (const definition of Object.values(spellAutomationSpecs).filter(def => def.contract.level >= 0 && def.contract.level <= 6)) {
  const plan = JSON.parse(JSON.stringify(compileSpellPlan(definition)));
  const requirements = describeSpellRequirements(plan);
  const source = {_id: 'originalSource01', name: 'Original fixture', type: 'spell', img: 'icons/svg/book.svg',
    system: {identifier: definition.id, level: definition.contract.level,
      source: {rules: '2014'}, description: {value: '<p>Original caller body.</p>', chat: 'Original caller chat'}}};
  const target = {_id: stableFoundryId('original-public-fixture', definition.id), ownership: {default: 2}};
  const bindings = {documentUuid: `Compendium.world.original-spells.Item.${target._id}`, summonProfiles: {}};
  const input = {source, plan, target, bindings};
  if (requirements.resources.length) {
    const failed = bindSpellContent(input);
    assert.equal(failed.status, 'unbound', definition.id);
    assert.equal(failed.item, undefined);
    assert(failed.errors.every(error => error.code === 'missing-summon-profile'));
    missingResources++;
  }
  for (const resource of requirements.resources) bindings.summonProfiles[resource.profileId] = {
    revision: resource.revision, recipeId: resource.recipeId,
    uuid: `Compendium.world.original-actors.Actor.${stableFoundryId('original-actor', resource.profileId)}`};
  const before = JSON.stringify(input);
  const bound = bindSpellContent(input);
  assert.equal(bound.status, 'bound', definition.id);
  assert.equal(bound.item._id, target._id);
  assert.equal(bound.item.system.description.value, source.system.description.value);
  assert.equal(bound.item.system.description.chat, source.system.description.chat);
  assert.equal(bound.receipt.executionPlanHash, plan.executionPlanHash);
  for (const effect of bound.item.effects) {
    if (effect.type === 'enchantment' && effect.origin === null) continue;
    assert.equal(effect.origin, bindings.documentUuid, `${definition.id}: effect origin`);
  }
  for (const activity of Object.values(bound.item.system.activities)) {
    if (activity.type !== 'summon') continue;
    for (const profile of activity.profiles) assert(Object.values(bindings.summonProfiles).some(binding => binding.uuid === profile.uuid));
  }
  assert.equal(JSON.stringify(input), before, 'Binding mutated input');
  assert.equal(JSON.stringify(bindSpellContent(input)), JSON.stringify(bound), 'Repeated binding drifted');
  const invalid = structuredClone(input); invalid.bindings.documentUuid = 'Compendium.world.other.Item.wrong';
  assert.equal(bindSpellContent(invalid).status, 'unbound');
  if (requirements.resources.length) {
    const mismatch = structuredClone(input);
    mismatch.bindings.summonProfiles[requirements.resources[0].profileId].revision++;
    assert.equal(bindSpellContent(mismatch).status, 'unbound');
  }
  spells++;
}
assert.equal(spells, 187); assert.equal(missingResources, 9);
console.log(JSON.stringify({browserBinding: spells, missingResourceCases: missingResources,
  browserBundleBytes: bundled.outputFiles[0].contents.length, nodeCompilerInBundle: false,
  sourceDocumentsUnchanged: true, realFoundryWorld: false}));
