import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {unzipSync} from 'fflate';
import {createModuleBundle,writeModuleBundle,writeModuleArchive} from '../src/index.mjs';

const fixture=()=>createModuleBundle({
  manifest:{id:'original-archive',version:'1.0.0',scripts:['script.js'],packs:[{name:'items',path:'packs/items',type:'Item'}]},
  documents:{items:[{_id:'originalItem001',name:'Original item',system:{description:{value:'Original complete description.'}},effects:[]}]},
  files:{'script.js':'throw Error("Do not execute source scripts");\r\n','image.bin':new Uint8Array([0,13,10,255])},
});
async function temporary(run){const root=await fs.mkdtemp(path.join(os.tmpdir(),'arcane-archive-test-'));try{await run(root);}finally{assert.equal(path.dirname(root),os.tmpdir());await fs.rm(root,{recursive:true,force:true});}}
async function files(root,rel=''){const result=[];for(const e of await fs.readdir(path.join(root,rel),{withFileTypes:true})){const name=rel?rel+'/'+e.name:e.name;if(e.isDirectory())result.push(...await files(root,name));else result.push(name);}return result.sort();}

test('finished module ZIP preserves every file and is stable for unchanged directory bytes',()=>temporary(async root=>{
  const directory=path.join(root,'module');await writeModuleBundle({directory,bundle:fixture()});
  const first=await writeModuleArchive({directory,archive:path.join(root,'first.zip')});
  const bytes=await fs.readFile(first.archive),contents=unzipSync(bytes),names=await files(directory);
  assert.deepEqual(Object.keys(contents).sort(),names);
  for(const name of names)assert.deepEqual(Buffer.from(contents[name]),await fs.readFile(path.join(directory,name)),name);
  assert.equal(first.files,names.length);assert.equal(first.bytes,bytes.length);
  assert.equal(first.sha256,createHash('sha256').update(bytes).digest('hex'));
  const second=await writeModuleArchive({directory,archive:path.join(root,'second.zip')});
  assert.equal(first.sha256,second.sha256);
  await assert.rejects(writeModuleArchive({directory,archive:first.archive}),/already exists/);
  assert.deepEqual(await fs.readFile(first.archive),bytes);
}));

test('archive refuses self-inclusion and aliases into the source directory',()=>temporary(async root=>{
  const directory=path.join(root,'module');await writeModuleBundle({directory,bundle:fixture()});
  await assert.rejects(writeModuleArchive({directory,archive:path.join(directory,'self.zip')}),/outside/);
  const alias=path.join(root,'alias');await fs.symlink(directory,alias,process.platform==='win32'?'junction':'dir');
  await assert.rejects(writeModuleArchive({directory,archive:path.join(alias,'self.zip')}),/inside/);
  await assert.rejects(writeModuleArchive({directory:alias,archive:path.join(root,'alias.zip')}),/regular directory/);
  await fs.symlink(root,path.join(directory,'linked'),process.platform==='win32'?'junction':'dir');
  await assert.rejects(writeModuleArchive({directory,archive:path.join(root,'linked.zip')}),/symbolic link/);
}));

test('archive requires a manifest and rejects oversized source before loading it',()=>temporary(async root=>{
  const directory=path.join(root,'module');await fs.mkdir(directory);
  await assert.rejects(writeModuleArchive({directory,archive:path.join(root,'missing.zip')}),/module.json/);
  const handle=await fs.open(path.join(directory,'oversized.bin'),'wx');
  try{await handle.truncate(512*1024*1024+1);}finally{await handle.close();}
  await assert.rejects(writeModuleArchive({directory,archive:path.join(root,'large.zip')}),/limits/);
  await assert.rejects(fs.access(path.join(root,'large.zip')));
}));

test('installed-style CLI emits module directory and explicit ZIP receipt',()=>temporary(async root=>{
  const input=path.join(root,'bundle.json'),directory=path.join(root,'module'),archive=path.join(root,'module.zip');
  await fs.writeFile(input,JSON.stringify(fixture()));
  const cli=fileURLToPath(new URL('../src/cli.mjs',import.meta.url));
  const result=spawnSync(process.execPath,[cli,'--input',input,'--out',directory,'--zip',archive],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const receipt=JSON.parse(result.stdout);assert.equal(receipt.archive.archive,archive);
  assert.equal(receipt.archive.moduleId,'original-archive');
  assert.equal(JSON.parse(Buffer.from(unzipSync(await fs.readFile(archive))['module.json']).toString('utf8')).id,'original-archive');
}));
