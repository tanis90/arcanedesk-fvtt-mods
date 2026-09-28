import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {spellAutomationSpecs, spellAutomationCompiledIds, perSpellScriptRegistry,
  assertRegisteredPerSpellScript, readPerSpellScriptSource} from '../src/index.mjs';
import {spellAutomationSpecs as legacy} from '@arcanedesk/auto2014-catalogue';

test('the new catalogue owns exactly its 167 authoring directories and legacy reuses the same definitions', () => {
  const directories = readdirSync(new URL('../src/spells/', import.meta.url)).sort();
  assert.equal(spellAutomationCompiledIds.length, 167);
  assert.deepEqual([...spellAutomationCompiledIds].sort(), directories);
  const counts = {};
  for (const [id, definition] of Object.entries(spellAutomationSpecs)) {
    assert.equal(definition, legacy[id], id);
    counts[definition.contract.level] = (counts[definition.contract.level] ?? 0) + 1;
    assertRegisteredPerSpellScript(definition);
  }
  assert.deepEqual(counts, {1: 43, 2: 35, 3: 34, 4: 18, 5: 18, 6: 19});
  assert.equal(Object.values(legacy).filter(definition => definition.contract.level === 0).length, 19);
});

test('both scripts ship with their owning spells and preserve the legacy artifact ABI', () => {
  assert.deepEqual(Object.keys(perSpellScriptRegistry).sort(), ['banishing-smite', 'harm']);
  for (const entry of Object.values(perSpellScriptRegistry)) {
    assert(readdirSync(new URL(`../src/spells/${entry.id}/`, import.meta.url)).includes('script.js'));
    assert.equal(entry.modulePath, `scripts/spells/${entry.id}.js`);
    const source = readPerSpellScriptSource(entry.id);
    assert(!/(?<!\r)\n/.test(source), 'Legacy artifact line endings');
  }
});
