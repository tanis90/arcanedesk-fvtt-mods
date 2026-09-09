import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../packages/auto2014-runtime/src/automation.js',import.meta.url),'utf8');
function harness(){
 const actor={uuid:'Actor.source'},scene={uuid:'Scene.test'};
 const token={actor,parent:scene,object:{id:'source'}};
 const targets=[{id:'target'}],calls=[];
 const context={canvas:{scene},parseCompilerSelectionCardinality:()=>({cardinality:{min:1,max:1}}),
  nativeSummonSourceToken:()=>token,targetsFromUseConfig:()=>targets,
  compilerSelectionCardinalityFailure:(message,code='INPUT_INVALID')=>Object.assign(new Error(message),{code}),
  MidiQOL:{checkActivityRange:(...args)=>{calls.push(args);return {result:'normal'};}}};
 vm.createContext(context);const start=source.indexOf('function preflightCompilerSelectedTargetRange(');
 vm.runInContext(source.slice(start,source.indexOf('\n}',start)+2),context);
 return {context,activity:{actor,range:{units:'touch'}},token,targets,calls};
}
test('selected target range uses the same native API for touch and numeric ranges, accepting long-range disadvantage',()=>{
 const h=harness();assert.equal(h.context.preflightCompilerSelectedTargetRange(h.activity,{}),true);
 assert.equal(h.calls[0][0],h.activity);assert.equal(h.calls[0][1],h.token.object);
 assert.deepEqual([...h.calls[0][2]],h.targets);assert.equal(h.calls[0][3],false);
 h.activity.range={units:'ft',value:30,long:120};h.context.MidiQOL.checkActivityRange=()=>({result:'dis'});
 assert.equal(h.context.preflightCompilerSelectedTargetRange(h.activity,{}),true);
});
test('range or wall rejection is input-invalid, unresolved source and checker failures are misconfigured',()=>{
 for(const [mutate,code] of [
  [h=>h.context.MidiQOL.checkActivityRange=()=>({result:'fail'}),'INPUT_INVALID'],
  [h=>delete h.context.MidiQOL.checkActivityRange,'ACTION_MISCONFIGURED'],
  [h=>h.context.MidiQOL.checkActivityRange=()=>({}),'ACTION_MISCONFIGURED'],
  [h=>h.context.nativeSummonSourceToken=()=>{throw Error('ambiguous');},'ACTION_MISCONFIGURED'],
  [h=>h.token.actor={uuid:'Actor.other'},'ACTION_MISCONFIGURED'],
  [h=>h.token.parent={uuid:'Scene.other'},'ACTION_MISCONFIGURED'],
 ]){const h=harness();mutate(h);assert.throws(()=>h.context.preflightCompilerSelectedTargetRange(h.activity,{}),e=>e.code===code);}
});
test('self, template and unbounded actions do not acquire a range requirement',()=>{
 const h=harness();h.context.parseCompilerSelectionCardinality=()=>({});
 assert.equal(h.context.preflightCompilerSelectedTargetRange(h.activity,{}),true);assert.equal(h.calls.length,0);
 h.context.parseCompilerSelectionCardinality=()=>({cardinality:{}});h.activity.range={units:'any'};
 assert.equal(h.context.preflightCompilerSelectedTargetRange(h.activity,{}),true);assert.equal(h.calls.length,0);
});
