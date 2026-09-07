import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync(new URL('../modules/arcane-dice-so-nice-dnd5e-fix/scripts/dice-so-nice-dnd5e-dd-fix.js',import.meta.url),'utf8');
test('dd correction copies d20 geometry once without mutating d20',()=>{
  const callbacks=new Map(); let unloads=0;
  const dd={shape:'d6',values:[1,2,3,4,5,6],unloadModel(){unloads++;}};
  const d20={shape:'d20',values:Array.from({length:20},(_,i)=>i+1),labels:Array.from({length:20},(_,i)=>String(i+1)),scale:1,mass:300,inertia:8};
  const ctx={game:{dice3d:{DiceFactory:{get:id=>id==='dd'?dd:d20}}},console:{info(){}},Hooks:{once:(n,f)=>callbacks.set(n,f),on:(n,f)=>callbacks.set(n,f)}};
  vm.runInNewContext(code,ctx);
  callbacks.get('diceSoNiceRollStart')();
  assert.equal(dd.shape,'d20'); assert.equal(dd.values.length,20); assert.notEqual(dd.values,d20.values);
  callbacks.get('diceSoNiceRollStart')(); assert.equal(unloads,1);
});
test('missing Dice So Nice is a harmless no-op',()=>{
  const callbacks=new Map(); vm.runInNewContext(code,{game:{},Hooks:{once:(n,f)=>callbacks.set(n,f),on:(n,f)=>callbacks.set(n,f)}});
  assert.equal(callbacks.get('diceSoNiceRollStart')(),false);
});
