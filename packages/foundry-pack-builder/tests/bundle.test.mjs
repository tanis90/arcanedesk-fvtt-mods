import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {ClassicLevel} from 'classic-level';
import {createModuleBundle,writeModuleBundle} from '../src/index.mjs';
const cli=fileURLToPath(new URL('../src/cli.mjs',import.meta.url));
const fixture=()=>({manifest:{id:'original-bundle',version:'1.0.0',scripts:['script.js'],packs:[{name:'spells',path:'packs/spells',type:'Item'}]},
  documents:{spells:[{_id:'originalItem001',name:'Original fixture',system:{description:{value:'原创完整描述。'}},effects:[]}]},
  files:{'script.js':'throw Error("fixture script must never execute");\r\n','image.bin':new Uint8Array([0,255,13,10])}});
async function temporary(run){const root=await fs.mkdtemp(path.join(os.tmpdir(),'arcane-bundle-test-'));try{await run(root);}finally{assert.equal(path.dirname(root),os.tmpdir());await fs.rm(root,{recursive:true,force:true});}}

test('CLI consumes JSON, preserves descriptions and raw bytes, and refuses overwrite',()=>temporary(async root=>{
  const data=fixture(),before=structuredClone(data),bundle=createModuleBundle(data),input=path.join(root,'input.json'),output=path.join(root,'module');
  assert.deepEqual(data,before);
  await fs.writeFile(input,JSON.stringify(bundle));
  const result=spawnSync(process.execPath,[cli,'--input',input,'--out',output],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).moduleId,data.manifest.id);
  assert.deepEqual(await fs.readFile(path.join(output,'image.bin')),Buffer.from(data.files['image.bin']));
  assert.equal(await fs.readFile(path.join(output,'script.js'),'utf8'),data.files['script.js']);
  const db=new ClassicLevel(path.join(output,'packs/spells'),{valueEncoding:'utf8',createIfMissing:false});
  try{await db.open();assert.deepEqual(JSON.parse(await db.get('!items!originalItem001')),data.documents.spells[0]);}finally{await db.close();}
  const again=spawnSync(process.execPath,[cli,'--input',input,'--out',output],{encoding:'utf8'});
  assert.notEqual(again.status,0);
  assert.match(again.stderr,/new or empty/);
  assert.equal(await fs.readFile(path.join(output,'script.js'),'utf8'),data.files['script.js']);
}));

test('invalid encodings, versions and traversal fail without output',()=>temporary(async root=>{
  const directory=path.join(root,'invalid'),bundle=createModuleBundle(fixture());
  await assert.rejects(writeModuleBundle({directory,bundle:{...bundle,schemaVersion:2}}),/version/);
  await assert.rejects(writeModuleBundle({directory,bundle:{...bundle,files:{'a':'%%'}}}),/base64/);
  await assert.rejects(writeModuleBundle({directory,bundle:{...bundle,files:{'../escape.txt':''}}}),/Invalid module file/);
  await assert.rejects(fs.stat(directory),{code:'ENOENT'});
}));

test('CLI arguments and invalid JSON fail without printing input content',()=>temporary(async root=>{
  const input=path.join(root,'invalid.json');await fs.writeFile(input,'SECRET_ORIGINAL_FIXTURE invalid JSON');
  const result=spawnSync(process.execPath,[cli,'--input',input,'--out',path.join(root,'out')],{encoding:'utf8'});
  assert.notEqual(result.status,0);assert.match(result.stderr,/not valid bundle JSON/);assert(!result.stderr.includes('SECRET_ORIGINAL_FIXTURE'));
  assert.notEqual(spawnSync(process.execPath,[cli,'--out',path.join(root,'out')]).status,0);
  assert.equal(spawnSync(process.execPath,[cli,'--help']).status,0);
}));
