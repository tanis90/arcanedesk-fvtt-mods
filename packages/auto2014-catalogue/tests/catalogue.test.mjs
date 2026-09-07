import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readPerSpellScriptSource} from '../src/index.mjs';
import {spellAutomationSpecs,spellAutomationCompiledIds,composeRegisteredSpell,summonProfileIdentities,perSpellScriptRegistry} from '../src/index.mjs';

test('the complete migrated registry and companion dependencies load',()=>{
  assert.equal(Object.keys(spellAutomationSpecs).length,186);
  assert.equal(spellAutomationCompiledIds.length,186);
  assert.equal(summonProfileIdentities.length,22);
  for(const identity of summonProfileIdentities)assert.deepEqual(Object.keys(identity).sort(),['documentId','profileId','recipeId','revision','summonUsage']);
  assert.deepEqual(Object.keys(perSpellScriptRegistry).sort(),['banishing-smite','harm']);
});

for(const id of spellAutomationCompiledIds)test(`${id}: caller descriptions do not alter compiled mechanics`,()=>{
  const input={_id:'migrationTest001',name:'Original migration test',type:'spell',img:'icons/svg/book.svg',
    system:{identifier:id,description:{value:'<p>Original caller content.</p>',chat:'Original chat content'},source:{rules:'2014'}}};
  const before=structuredClone(input);
  const first=composeRegisteredSpell(input);
  const alternative=structuredClone(input);
  alternative.system.description={value:'<p>另一份自有测试描述。</p>',chat:'替换后的聊天描述'};
  alternative.img='icons/svg/dice-target.svg';
  const second=composeRegisteredSpell(alternative);
  assert.deepEqual(input,before);
  assert.equal(first.item._id,input._id);
  assert.deepEqual(first.item.system.description,input.system.description);
  assert.deepEqual(second.item.system.description,alternative.system.description);
  assert.equal(first.compilation.executionPlanHash,second.compilation.executionPlanHash);
  assert.deepEqual(first.item.system.activities,second.item.system.activities);
});

test('unknown or absent identifiers cannot silently receive a recipe',()=>{
  assert.throws(()=>composeRegisteredSpell({system:{identifier:'not-registered'}}),/No compiled spell recipe/);
  assert.throws(()=>composeRegisteredSpell({name:'Bless'}),/No compiled spell recipe/);
});

test('packaged per-spell scripts preserve the shipped baseline bytes',()=>{
  const expected={
    'banishing-smite':'c92c269b4a5332cfcf55d57f3caa310667f5e5eba707e48bface893de5bc2c8b',
    harm:'609173cf50d8b773563de23953cd16d97cda9f3397db5fa077e3ddf452cbaeae',
  };
  for(const [id,hash] of Object.entries(expected))assert.equal(createHash('sha256').update(readPerSpellScriptSource(id)).digest('hex'),hash);
  assert.throws(()=>readPerSpellScriptSource('../unregistered'),/Unknown per-spell script/);
});
