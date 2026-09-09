import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../packages/auto2014-runtime/src/automation.js',import.meta.url),'utf8');
function harness(){
 const ctx={MODULE_ID:'arcane-dnd5e-2014-automation',COMPILER_MOVEMENT_SUPPRESSION_ACTORS:new WeakSet()};vm.createContext(ctx);
 for(const name of ['compilerMovementReductionGroup','compilerMovementReductionSuppressed']){
  const start=source.indexOf(`function ${name}(`);assert.ok(start>0);vm.runInContext(source.slice(start,source.indexOf('\n}',start)+2),ctx);
 }
 const actor={effects:[]};
 function effect(id,strength=10,spell='ray-of-frost'){
  const e={id,type:'base',parent:actor,disabled:false,transfer:false,statuses:new Set(),_stats:{createdTime:1},
   changes:[{key:'system.attributes.movement.all',value:`-${strength}`,mode:0,priority:20}],
   flags:{[ctx.MODULE_ID]:{host:'actor',identity:{scope:'source-target'},reapply:'replace',sourceActorUuid:`Actor.${id}`,identifier:spell,compilerArtifactIds:['slow']}}};
  Object.defineProperty(e,'isSuppressed',{get(){return ctx.compilerMovementReductionSuppressed(e,e.nativeSuppressed===true);}});
  actor.effects.push(e);return e;
 }
 return {actor,effect,ctx};
}
test('equal sources contribute once, keep both documents, and hand over after deletion',()=>{
 const h=harness(),a=h.effect('a'),b=h.effect('b');b._stats.createdTime=2;
 assert.equal(a.isSuppressed,true);assert.equal(b.isSuppressed,false);assert.equal(h.actor.effects.length,2);
 assert.equal(a.disabled,false);assert.equal(b.disabled,false);
 h.actor.effects.splice(1,1);assert.equal(a.isSuppressed,false);
});
test('strongest wins; disabled/native-suppressed sources cannot suppress a healthy source',()=>{
 const h=harness(),a=h.effect('a',20),b=h.effect('b',10);
 assert.equal(a.isSuppressed,false);assert.equal(b.isSuppressed,true);
 a.disabled=true;assert.equal(b.isSuppressed,false);a.disabled=false;a.nativeSuppressed=true;
 assert.equal(a.isSuppressed,true);assert.equal(b.isSuppressed,false);
});
test('different spells/artifacts, statuses and foreign mechanics remain separate',()=>{
 const h=harness(),a=h.effect('a'),b=h.effect('b',10,'spirit-shroud-tce');
 assert.equal(a.isSuppressed,false);assert.equal(b.isSuppressed,false);
 const c=h.effect('c');c.statuses.add('prone');assert.equal(c.isSuppressed,false);
 const d=h.effect('d');d.changes.push({key:'system.attributes.ac.bonus',value:'1',mode:2});assert.equal(d.isSuppressed,false);
 assert.equal(a.isSuppressed,false);
});
test('stable tie-breaking and native errors never leave recursion guard active',()=>{
 const h=harness(),b=h.effect('b'),a=h.effect('a');assert.equal(a.isSuppressed,false);assert.equal(b.isSuppressed,true);
 Object.defineProperty(b,'nativeSuppressed',{get(){throw Error('native error');}});
 assert.throws(()=>a.isSuppressed,/native error/);assert.equal(h.ctx.COMPILER_MOVEMENT_SUPPRESSION_ACTORS.has(h.actor),false);
});
