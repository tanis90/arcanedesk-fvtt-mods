import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {zipSync} from 'fflate';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'dist');
await fs.mkdir(out,{recursive:true});
const artifacts=[];
for(const id of (await fs.readdir(path.join(root,'modules'))).sort()) {
  const dir=path.join(root,'modules',id);
  const manifest=JSON.parse(await fs.readFile(path.join(dir,'module.json'),'utf8'));
  if(manifest.id!==id || !/^\d+\.\d+\.\d+$/.test(manifest.version)) throw Error('Invalid module identity: '+id);
  const files={};
  async function collect(base,rel='') {
    for(const name of (await fs.readdir(base)).sort()) {
      if(name==='validate.mjs') continue;
      const full=path.join(base,name), key=rel+name, st=await fs.lstat(full);
      if(st.isSymbolicLink()) throw Error('Symlink in module');
      if(st.isDirectory()) await collect(full,key+'/');
      else files[key]=[new Uint8Array(await fs.readFile(full)),{mtime:new Date(2000,0,1,0,0,0)}];
    }
  }
  await collect(dir);
  for(const name of ['LICENSE','NOTICE']) files[name]=[new Uint8Array(await fs.readFile(path.join(root,name))),{mtime:new Date(2000,0,1,0,0,0)}];
  const bytes=zipSync(files,{level:9}), name=`${id}-${manifest.version}.zip`;
  await fs.writeFile(path.join(out,name),bytes);
  artifacts.push({id,version:manifest.version,file:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await fs.writeFile(path.join(out,'artifacts.json'),JSON.stringify({artifacts},null,2)+'\n');
console.log(JSON.stringify({artifacts},null,2));
