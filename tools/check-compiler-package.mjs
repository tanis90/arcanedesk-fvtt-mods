import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
if(!process.env.npm_execpath) throw Error('Run through npm run pack:check');
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'arcane-compiler-pack-'));
const npm=(args,cwd)=>execFileSync(process.execPath,[process.env.npm_execpath,...args],{cwd,encoding:'utf8',env:{...process.env,npm_config_audit:'false',npm_config_fund:'false'}});
try {
  const packedPackages=JSON.parse(npm(['pack','--workspaces','--ignore-scripts','--json','--pack-destination',temp],root));
  assert.equal(packedPackages.length,2);
  for(const packed of packedPackages) {
    assert(packed.files.some(f=>f.path==='LICENSE'));
    assert(packed.files.some(f=>f.path==='NOTICE'));
    assert(packed.files.every(f=>['README.md','package.json','LICENSE','NOTICE'].includes(f.path)||f.path.startsWith('src/')));
  }
  await fs.writeFile(path.join(temp,'package.json'),'{"private":true,"type":"module"}\n');
  npm(['install','--ignore-scripts','--offline',...packedPackages.map(p=>path.join(temp,p.filename))],temp);
  execFileSync(process.execPath,['--input-type=module','-e','import {compileSpellAutomation} from "@arcanedesk/auto2014-compiler"; import {cleanRoomSpell} from "@arcanedesk/auto2014-compiler/dsl"; import {readRuntimeSource} from "@arcanedesk/auto2014-runtime"; if(typeof compileSpellAutomation!=="function" || typeof cleanRoomSpell!=="function" || !(await readRuntimeSource()).includes("dnd5e.preUseActivity")) throw Error("Missing exports");'],{cwd:temp,stdio:'pipe'});
  console.log(JSON.stringify(packedPackages.map(packed=>({name:packed.name,version:packed.version,files:packed.files.length,packedBytes:packed.size,installedOutsideWorkspace:true}))));
} finally {
  // mkdtemp created this exact directory for this invocation; never remove caller paths.
  assert(path.dirname(temp)===os.tmpdir());
  await fs.rm(temp,{recursive:true,force:true});
}
