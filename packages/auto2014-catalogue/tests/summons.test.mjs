import test from 'node:test';
import assert from 'node:assert/strict';
import {createSummonAssembler} from '../src/summons.mjs';
import {trainingSummonInput} from './fixtures/summon-provider.mjs';

test('original JSON input assembles an Actor without a private provider',()=>{
  const input=trainingSummonInput(),before=structuredClone(input);
  const assembler=createSummonAssembler(input.contracts);
  const first=assembler.assembleSummonProvider(JSON.parse(JSON.stringify(input.provider)));
  assert.deepEqual(input,before);
  assert.equal(first.actors.length,1);
  assert.equal(first.actors[0]._id,'originalActor001');
  assert.equal(first.actors[0].name,'Original training orb');
  assert.equal(first.actors[0].items.length,1);
  assert(first.actors[0].items[0].system.description.value.includes(input.provider.recipes[0].manualRules[0]));
  assert.deepEqual(assembler.assembleSummonProvider(input.provider),first);
});

test('candidate ID drift and mutated caller contracts cannot change the accepted identity',()=>{
  const input=trainingSummonInput(),assembler=createSummonAssembler(input.contracts);
  input.contracts.expectedSummonProfileDocuments[0][1]='anotherActor0001';
  assert.equal(assembler.assembleSummonProvider(input.provider).actors[0]._id,'originalActor001');
  input.provider.profiles[0].documentId='anotherActor0001';
  assert.throws(()=>assembler.assembleSummonProvider(input.provider),/documentId drifted/);
});

test('malformed provider and ambiguous validation tables fail explicitly',()=>{
  const input=trainingSummonInput(),assembler=createSummonAssembler(input.contracts);
  assert.throws(()=>assembler.assembleSummonProvider({...input.provider,import:'external.mjs'}),/keys must be exactly/);
  input.contracts.expectedSummonProfileDocuments.push(input.contracts.expectedSummonProfileDocuments[0]);
  assert.throws(()=>createSummonAssembler(input.contracts),/repeat a key/);
});
