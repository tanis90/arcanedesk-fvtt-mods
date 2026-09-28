import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

import {mergeIndex, rewriteManifest, serializeIndexCrlf, commitIndex, addPackage, putImmutable, ossUrls} from '../tools/oss-mirror-publish.mjs';

const manifest = {id: 'demo', version: '1.2.3', download: 'https://github.com/x/y/releases/download/v1.2.3/demo.zip'};

function fakeIndex(...entries) {
  return {generated: '2026-01-01T00:00:00+00:00', packages: entries, profiles: []};
}

test('rewriteManifest points download/manifest at the bucket', () => {
  const next = rewriteManifest(manifest, 'demo', '1.2.3');
  assert.equal(next.download, ossUrls('demo', '1.2.3').zipUrl);
  assert.equal(next.manifest, ossUrls('demo', '1.2.3').manifestUrl);
  assert.equal(next.id, 'demo');
});

test('mergeIndex rejects an immutable id@version and sorts by group/id', () => {
  const existing = fakeIndex({id: 'demo', version: '1.2.3', group: 'arcane'});
  assert.throws(() => mergeIndex(existing, {id: 'demo', version: '1.2.3', group: 'arcane'}), /immutable/);
  const next = mergeIndex(fakeIndex(), {id: 'demo', version: '1.2.3', group: 'arcane'});
  assert.equal(next.packages.length, 1);
  assert.ok(serializeIndexCrlf(next).includes('\r\n'));
});

// Index store that can interleave a concurrent writer: after the first index PUT the
// read-back shows the concurrent writer's index (our entry lost) once, then behaves.
function clientWithRace() {
  const state = {index: fakeIndex()};
  let puts = 0;
  let raceDone = false;
  return {
    state, puts: () => puts,
    async get(key) {
      if (key !== 'index.json') throw new Error('unexpected get ' + key);
      if (puts === 1 && !raceDone) {
        raceDone = true;
        state.index = fakeIndex({id: 'other', version: '0.0.1', group: 'arcane'}); // our write got clobbered
      }
      return {content: Buffer.from(JSON.stringify(state.index)), res: {headers: {etag: 'e'}}};
    },
    async put(key, buffer) {
      if (key === 'index.json') { puts += 1; state.index = JSON.parse(buffer.toString('utf8')); return; }
      throw new Error('unexpected object put');
    },
  };
}

test('commitIndex detects a lost write on read-back and re-merges from fresh state', async () => {
  const client = clientWithRace();
  const result = await commitIndex(client, index => mergeIndex(index, {id: 'demo', version: '1.2.3', group: 'arcane'}));
  assert.deepEqual(result.packages.map(p => p.id).sort(), ['demo', 'other'], 'retry keeps the concurrent entry');
  assert.equal(client.puts(), 2);
});

test('commitIndex gives up after three failed read-backs', async () => {
  let gets = 0;
  const client = {
    async get() {
      gets += 1;
      // read-backs (even gets) always show a foreign index: our write never survives
      const index = gets % 2 === 0 ? fakeIndex({id: 'foreign', version: '9', group: 'x'}) : fakeIndex();
      return {content: Buffer.from(JSON.stringify(index)), res: {headers: {etag: 'e'}}};
    },
    async put(key, buffer) { /* write lands but the read-back above never confirms */ },
  };
  await assert.rejects(() => commitIndex(client, index => mergeIndex(index, {id: 'demo', version: '1', group: 'arcane'})), /read-back verification 3 times/);
});

test('putImmutable replays identical bytes idempotently and rejects different bytes', async () => {
  const buffer = Buffer.from('payload');
  const md5 = createHash('md5').update(buffer).digest('hex');
  const makeClient = etag => ({
    puts: 0,
    async put() { throw Object.assign(new Error('exists'), {code: 'FileAlreadyExists', status: 409}); },
    async head() { return {res: {headers: {etag: `"${etag}"`}}}; },
  });
  await putImmutable(makeClient(md5), 'packages/demo/1/demo.zip', buffer, 'application/zip');
  await assert.rejects(() => putImmutable(makeClient('deadbeef'), 'packages/demo/1/demo.zip', buffer, 'application/zip'), /different bytes/);
});

function zipWithRootModuleJson() {
  // hand-rolled stored (method 0) zip containing only module.json
  const content = Buffer.from(JSON.stringify(manifest), 'utf8');
  const name = Buffer.from('module.json', 'utf8');
  const local = Buffer.alloc(30 + name.length + content.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(0, 6); local.writeUInt16LE(0, 8); // no flags, method 0
  local.writeUInt32LE(0, 14);
  local.writeUInt32LE(0, 18); // crc (not validated by the publisher)
  local.writeUInt32LE(content.length, 22); local.writeUInt32LE(content.length, 26);
  local.writeUInt16LE(name.length, 28);
  name.copy(local, 30); content.copy(local, 30 + name.length);
  const central = Buffer.alloc(46 + name.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(0, 10); central.writeUInt16LE(0, 12); central.writeUInt16LE(0, 14);
  central.writeUInt32LE(0, 16);
  central.writeUInt32LE(content.length, 20); central.writeUInt32LE(content.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(local.length, 42);
  name.copy(central, 46);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(central.length, 12); eocd.writeUInt32LE(local.length, 16);
  return Buffer.concat([local, central, eocd]);
}

function fakeClientForAdd({preExistingObjects = false} = {}) {
  const store = new Map();
  const state = {index: fakeIndex()};
  let etagSeq = 0;
  return {
    store, state,
    async get(key) {
      if (key === 'index.json') return {content: Buffer.from(JSON.stringify(state.index)), res: {headers: {etag: `e${++etagSeq}`}}};
      throw new Error('unexpected get ' + key);
    },
    async head(key) {
      const bytes = store.get(key);
      if (!bytes) throw new Error('head: missing ' + key);
      return {res: {headers: {etag: `"${createHash('md5').update(bytes).digest('hex')}"`}}};
    },
    async put(key, buffer, {headers} = {}) {
      if (key === 'index.json') { state.index = JSON.parse(buffer.toString('utf8')); return; }
      if (store.has(key)) throw Object.assign(new Error('exists'), {code: 'FileAlreadyExists', status: 409});
      if (headers?.['x-oss-forbid-overwrite'] !== 'true') throw new Error('missing forbid-overwrite on ' + key);
      store.set(key, buffer);
    },
    seed(key, buffer) { store.set(key, buffer); },
    get preExisting() { return preExistingObjects; },
  };
}

test('addPackage uploads immutable objects and appends the index entry', async () => {
  const client = fakeClientForAdd();
  const zipBuffer = zipWithRootModuleJson();
  const entry = await addPackage(client, {id: 'demo', version: '1.2.3', group: 'arcane', zipBuffer, manifest});
  assert.equal(entry.bytes, zipBuffer.length);
  assert.equal(entry.sha256, createHash('sha256').update(zipBuffer).digest('hex'));
  assert.ok(client.store.has('packages/demo/1.2.3/demo-1.2.3.zip'));
  const mirrored = JSON.parse(client.store.get('packages/demo/1.2.3/module.json').toString('utf8'));
  assert.equal(mirrored.download, ossUrls('demo', '1.2.3').zipUrl);
  assert.deepEqual(client.state.index.packages.map(p => p.id), ['demo']);
  await assert.rejects(() => addPackage(client, {id: 'demo', version: '1.2.3', group: 'arcane', zipBuffer, manifest}), /immutable/);
});

test('addPackage replays cleanly after objects landed but the index write failed', async () => {
  const client = fakeClientForAdd();
  const zipBuffer = zipWithRootModuleJson();
  // first run: objects land, index never records them (interrupt before commitIndex)
  await putImmutable(client, 'packages/demo/1.2.3/demo-1.2.3.zip', zipBuffer, 'application/zip');
  await putImmutable(client, 'packages/demo/1.2.3/module.json',
    Buffer.from(`${JSON.stringify(rewriteManifest(manifest, 'demo', '1.2.3'), null, 2)}\n`), 'application/json');
  // second run must succeed via the idempotent object path
  const entry = await addPackage(client, {id: 'demo', version: '1.2.3', group: 'arcane', zipBuffer, manifest});
  assert.equal(entry.id, 'demo');
  assert.deepEqual(client.state.index.packages.map(p => p.id), ['demo']);
});

test('addPackage rejects a manifest/zip identity mismatch', async () => {
  const client = fakeClientForAdd();
  await assert.rejects(
    () => addPackage(client, {id: 'other', version: '1.2.3', group: 'arcane', zipBuffer: zipWithRootModuleJson(), manifest}),
    /manifest id "demo" != "other"/);
});

test('cn-mirror decision table stays exhaustive against the module tree', async () => {
  const {readdir} = await import('node:fs/promises');
  const table = JSON.parse(await readFile(path.resolve(import.meta.dirname, '../tools/cn-mirror.json'), 'utf8'));
  const dirs = (await readdir(path.resolve(import.meta.dirname, '../modules'), {withFileTypes: true}))
    .filter(d => d.isDirectory()).map(d => d.name);
  assert.deepEqual(Object.keys(table.modules).sort(), [...dirs].sort(), 'every module dir is registered and vice versa');
  for (const [id, entry] of Object.entries(table.modules)) {
    if (entry.cnMirror) assert.ok(['build', 'release'].includes(entry.artifact), `${id} needs an artifact mode`);
  }
});
