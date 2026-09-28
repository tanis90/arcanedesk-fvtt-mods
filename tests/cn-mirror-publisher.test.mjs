import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

import {mergeIndex, rewriteManifest, serializeIndexCrlf, commitIndex, addPackage, ossUrls} from '../tools/oss-mirror-publish.mjs';

const manifest = {id: 'demo', version: '1.2.3', download: 'https://github.com/x/y/releases/download/v1.2.3/demo.zip'};

function fakeIndex(...entries) {
  return {generated: '2026-01-01T00:00:00+00:00', packages: entries, profiles: []};
}

test('rewriteManifest points download/manifest at the bucket', () => {
  const next = rewriteManifest(manifest, 'demo', '1.2.3');
  assert.equal(next.download, `${ossUrls('demo', '1.2.3').zipUrl}`);
  assert.equal(next.manifest, `${ossUrls('demo', '1.2.3').manifestUrl}`);
  assert.equal(next.id, 'demo');
});

test('mergeIndex rejects an immutable id@version and sorts by group/id', () => {
  const existing = fakeIndex({id: 'demo', version: '1.2.3', group: 'arcane'});
  assert.throws(() => mergeIndex(existing, {id: 'demo', version: '1.2.3', group: 'arcane'}), /immutable/);
  const next = mergeIndex(fakeIndex(), {id: 'demo', version: '1.2.3', group: 'arcane'});
  assert.equal(next.packages.length, 1);
  assert.ok(serializeIndexCrlf(next).includes('\r\n'));
});

test('commitIndex retries the merge on ETag conflict and converges', async () => {
  let etags = 0;
  const client = {
    async get() {
      etags += 1;
      const index = etags === 1 ? fakeIndex() : fakeIndex({id: 'other', version: '0.0.1', group: 'arcane'});
      return {content: Buffer.from(JSON.stringify(index)), res: {headers: {etag: `etag-${etags}`}}};
    },
    puts: [],
    async put(key, buffer, {headers}) {
      this.puts.push({key, etag: headers['If-Match']});
      if (headers['If-Match'] === 'etag-1') {
        throw Object.assign(new Error('conflict'), {status: 412, code: 'PreconditionFailed'});
      }
    },
  };
  const next = await commitIndex(client, index => mergeIndex(index, {id: 'demo', version: '1.2.3', group: 'arcane'}));
  assert.equal(next.packages.length, 2, 'retried merge keeps the concurrently added entry');
  assert.equal(client.puts.length, 2);
});

test('commitIndex gives up after three conflicts', async () => {
  let gets = 0;
  const client = {
    async get() { gets += 1; return {content: Buffer.from(JSON.stringify(fakeIndex())), res: {headers: {etag: `e${gets}`}}}; },
    async put(key, buffer, {headers}) { throw Object.assign(new Error('conflict'), {status: 412}); },
  };
  await assert.rejects(() => commitIndex(client, index => mergeIndex(index, {id: 'demo', version: '1', group: 'arcane'})), /conflicted 3 times/);
  assert.equal(gets, 3);
});

function fakeClientForAdd() {
  const store = new Map();
  const state = {index: fakeIndex()};
  let etagSeq = 0;
  return {
    store, state,
    async get(key) {
      if (key === 'index.json') return {content: Buffer.from(JSON.stringify(state.index)), res: {headers: {etag: `e${++etagSeq}`}}};
      throw new Error('unexpected get ' + key);
    },
    async put(key, buffer, {headers}) {
      if (key === 'index.json') {
        state.index = JSON.parse(buffer.toString('utf8'));
        return;
      }
      if (store.has(key)) throw new Error('overwrite of immutable object: ' + key);
      if (headers?.['x-oss-forbid-overwrite'] !== 'true') throw new Error('missing forbid-overwrite on ' + key);
      store.set(key, buffer);
    },
  };
}

function zipWithRootModuleJson() {
  // hand-rolled stored (method 0) zip containing only module.json
  const content = Buffer.from(JSON.stringify(manifest), 'utf8');
  const name = Buffer.from('module.json', 'utf8');
  const local = Buffer.alloc(30 + name.length + content.length);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(0, 6); local.writeUInt16LE(0, 8); // no flags, method 0
  local.writeUInt32LE(0, 14); // dos time/date
  local.writeUInt32LE(0, 18); // crc (not checked by the validator)
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
