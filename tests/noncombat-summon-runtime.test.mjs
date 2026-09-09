import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../packages/auto2014-runtime/src/automation.js',import.meta.url),'utf8');
function extract(name){
 const start=source.indexOf(`async function ${name}(`);
 assert(start>=0);
 return source.slice(start,source.indexOf('\n}',start)+2);
}
function harness({noncombat=true,placed=4,foreignCombatant=false}={}){
 const tokens=Array.from({length:placed},(_,i)=>({id:`token${i}`,uuid:`Scene.test.Token.token${i}`,parent:{id:'test',uuid:'Scene.test'}}));
 const record={requestId:'cast-1',activityUuid:'Activity.test',sourceCombatantUuid:noncombat?null:'Combat.source',
  inheritedInitiative:noncombat?null:12,combatUuid:noncombat?null:'Combat.test',
  postSummonSeen:true,postUseSeen:true,contract:{expectedCount:4,marker:{artifactId:'light',choice:'four',profileId:'light',...(noncombat?{combat:'none'}:{})}}};
 const calls=[];
 const combat={documentName:'Combat',uuid:'Combat.test',active:true,scene:{uuid:'Scene.test'}};
 const context={game:{combats:[combat]},foundry:{utils:{deepClone:structuredClone}},setTimeout(){},
  NATIVE_SUMMON_INVOCATIONS:new Map(),
  nativeSummonResolveCreatedTokens:async()=>tokens,
  nativeSummonApplyOwnershipAndProvenance:async()=>calls.push('ownership'),
  nativeSummonBindLifecycle:async()=>{calls.push('lifecycle');return {mode:'concentration-effect',effectUuid:'Effect.test'};},
  fromUuid:async id=>{assert.equal(id,'Combat.test');calls.push('resolve-combat');return combat;},
  nativeSummonReplacementTokens:()=>[],
  nativeSummonCombatantsForToken:()=>foreignCombatant?[{id:'unexpected'}]:[],
  nativeSummonMutateCombatPreservingCursor:async(_combat,fn)=>{calls.push('mutate-combat');return fn({currentId:'source'});},
  nativeSummonEnsureCombatants:async()=>{calls.push('combatants');return tokens.map(t=>({uuid:`Combatant.${t.id}`}));},
  nativeSummonDeleteReplacedTokens:async()=>{},
 };
 const finalize=vm.runInNewContext(`(${extract('finalizeNativeSummonCore')})`,context);
 return {record,calls,finalize:()=>finalize(record,{createdTokenUuids:tokens.map(t=>t.uuid)})};
}

test('noncombat finalizer retains ownership and lifecycle but never resolves or mutates Combat',async()=>{
 for(const placed of [0,1,2,3,4]){
  const h=harness({placed});const receipt=await h.finalize();
  assert.deepEqual(h.calls,['ownership','lifecycle']);
  assert.equal(receipt.combat,'none');assert.equal(receipt.sourceCombatantUuid,null);
  assert.equal(receipt.inheritedInitiative,null);
  assert.equal(receipt.members.length,placed);
  assert(receipt.members.every(m=>m.combatantUuid===null));
  assert.equal(receipt.outcome,placed===4?'placed':placed===0?'skipped-manual':'partial-manual');
  assert.equal(receipt.skippedCount,4-placed);
 }
});

test('independent summons still resolve Combat and obtain combatants; unexpected noncombat membership fails',async()=>{
 const h=harness({noncombat:false});const receipt=await h.finalize();
 assert.deepEqual(h.calls,['ownership','lifecycle','resolve-combat','mutate-combat','combatants']);
 assert.equal(receipt.combat,undefined);
 assert.equal(receipt.inheritedInitiative,12);
 assert(receipt.members.every(m=>m.combatantUuid));
 await assert.rejects(harness({foreignCombatant:true}).finalize(),/unexpectedly belongs/);
 const incomplete=harness();incomplete.record.postUseSeen=false;
 await assert.rejects(incomplete.finalize(),/exact postUseActivity/);
 assert.deepEqual(incomplete.calls,[]);
});
