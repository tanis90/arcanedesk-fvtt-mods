import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';

// cn-mirror.json is an exhaustive decision table: every modules/ directory must be
// registered, every registered id must exist, and every cnMirror:true id must match
// its module.json id. New modules fail verify until the decision is made explicitly.

const root = path.resolve(import.meta.dirname, '..');
const problems = [];

const table = JSON.parse(await readFile(path.join(root, 'tools/cn-mirror.json'), 'utf8'));
if (table.schemaVersion !== 1 || !table.modules || typeof table.modules !== 'object') {
  console.error('check-cn-mirror: invalid schema'); process.exit(1);
}

const dirs = (await readdir(path.join(root, 'modules'), {withFileTypes: true}))
  .filter(d => d.isDirectory()).map(d => d.name).sort();
const registered = Object.keys(table.modules).sort();

for (const dir of dirs) if (!table.modules[dir]) problems.push(`unregistered module directory: modules/${dir}`);
for (const id of registered) if (!dirs.includes(id)) problems.push(`registered id has no directory: modules/${id}`);

for (const id of registered) {
  const entry = table.modules[id];
  if (typeof entry.cnMirror !== 'boolean') problems.push(`${id}: cnMirror must be boolean`);
  if (entry.cnMirror) {
    if (!['build', 'release'].includes(entry.artifact)) problems.push(`${id}: cnMirror:true requires artifact 'build' or 'release'`);
    if (!entry.reason) problems.push(`${id}: cnMirror:true requires a reason`);
    const manifest = JSON.parse(await readFile(path.join(root, 'modules', id, 'module.json'), 'utf8'));
    if (manifest.id !== id) problems.push(`${id}: module.json id "${manifest.id}" != directory name`);
    if (!/^\d+\.\d+\.\d+$/.test(String(manifest.version))) problems.push(`${id}: module.json version is not semver`);
  } else if (entry.artifact !== undefined) {
    problems.push(`${id}: artifact is only meaningful when cnMirror is true`);
  }
  if (!entry.reason) problems.push(`${id}: missing reason`);
}

if (problems.length) {
  for (const p of problems) console.error('check-cn-mirror: ' + p);
  process.exit(1);
}
console.log(`check-cn-mirror: ${dirs.length} modules registered, ${registered.filter(id => table.modules[id].cnMirror).length} mirrored to CN`);
