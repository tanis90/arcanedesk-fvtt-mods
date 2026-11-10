import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  BASE_URL,
  RECEIPT_PREFIX,
  buildReceipt,
  ossUrls,
  publishReceipt,
  putImmutable,
  receiptKey,
  receiptUrl,
  rewriteManifest,
} from '../tools/oss-mirror-publish.mjs';
import {planFor} from '../tools/release-cn.mjs';

const manifest = {id: 'demo', version: '1.2.3', download: 'https://github.com/x/y/releases/download/v1.2.3/demo.zip'};
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

function zipWithRootModuleJson(moduleJson = manifest) {
  // hand-rolled stored (method 0) zip containing only module.json
  const content = Buffer.from(JSON.stringify(moduleJson), 'utf8');
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

function fakeOss() {
  const store = new Map();
  const puts = [];
  return {
    store,
    puts,
    client: {
      async get(key) {
        const bytes = store.get(key);
        if (bytes) return {content: bytes};
        throw Object.assign(new Error(`missing ${key}`), {status: 404});
      },
      async head(key) {
        const bytes = store.get(key);
        if (!bytes) throw Object.assign(new Error(`missing ${key}`), {status: 404});
        return {res: {headers: {'content-length': String(bytes.length)}}};
      },
      async put(key, buffer, {headers} = {}) {
        puts.push(key);
        if (key === 'index.json') throw new Error('index.json must never be written by this publisher');
        if (headers?.['x-oss-forbid-overwrite'] !== 'true') throw new Error(`missing forbid-overwrite on ${key}`);
        if (store.has(key)) throw Object.assign(new Error('exists'), {code: 'FileAlreadyExists', status: 409});
        store.set(key, Buffer.from(buffer));
      },
    },
  };
}

function fakeFetchJson(store) {
  return async (url, {method = 'GET'} = {}) => {
    if (!url.startsWith(`${BASE_URL}/`)) throw new Error(`unexpected URL ${url}`);
    const key = url.slice(BASE_URL.length + 1);
    const bytes = store.get(key);
    if (method === 'HEAD') return {status: bytes ? 200 : 404, length: bytes ? bytes.length : -1};
    if (!bytes) return null;
    return JSON.parse(bytes.toString('utf8'));
  };
}

const source = {
  repo: 'tanis90/arcanedesk-fvtt-mods',
  commit: 'a'.repeat(40),
  workflow: 'mirror-release',
  runId: '123',
};

test('rewriteManifest points download/manifest at the bucket', () => {
  const next = rewriteManifest(manifest, 'demo', '1.2.3');
  assert.equal(next.download, ossUrls('demo', '1.2.3').zipUrl);
  assert.equal(next.manifest, ossUrls('demo', '1.2.3').manifestUrl);
  assert.equal(next.id, 'demo');
});

test('buildReceipt records object bytes, hashes, URLs and provenance', () => {
  const zipBuffer = zipWithRootModuleJson();
  const receipt = buildReceipt({id: 'demo', version: '1.2.3', zipBuffer, manifest, source});
  assert.equal(RECEIPT_PREFIX, 'packages/_receipts');
  assert.equal(receipt.schemaVersion, 1);
  assert.equal(receipt.kind, 'module');
  assert.equal(receipt.group, 'arcane');
  assert.equal(receipt.bytes, zipBuffer.length);
  assert.equal(receipt.sha256, sha256(zipBuffer));
  assert.equal(receipt.zipUrl, ossUrls('demo', '1.2.3').zipUrl);
  assert.equal(receipt.manifestUrl, ossUrls('demo', '1.2.3').manifestUrl);
  const expectedManifest = Buffer.from(`${JSON.stringify(rewriteManifest(manifest, 'demo', '1.2.3'), null, 2)}\n`, 'utf8');
  assert.equal(receipt.manifestSha256, sha256(expectedManifest));
  assert.deepEqual(receipt.source, source);
  assert.equal(receipt.indexWriter, 'tanis90/arcanedesk-ops');
  assert.match(receipt.publishedAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\+00:00$/);
  assert.equal(receiptKey('demo', '1.2.3'), 'packages/_receipts/demo/1.2.3.json');
  assert.equal(receiptUrl('demo', '1.2.3'), `${BASE_URL}/packages/_receipts/demo/1.2.3.json`);
});

test('buildReceipt rejects a manifest/identity mismatch', () => {
  const zipBuffer = zipWithRootModuleJson();
  assert.throws(() => buildReceipt({id: 'other', version: '1.2.3', zipBuffer, manifest, source}), /manifest id/);
  assert.throws(() => buildReceipt({id: 'demo', version: '1.2.4', zipBuffer, manifest, source}), /manifest version/);
  assert.throws(() => buildReceipt({id: 'demo', version: '1.2.3', zipBuffer, manifest}), /source object/);
});

test('publishReceipt uploads two immutable objects and a receipt, never index.json', async () => {
  const {store, puts, client} = fakeOss();
  const zipBuffer = zipWithRootModuleJson();
  const manifestBytes = Buffer.from(`${JSON.stringify(rewriteManifest(manifest, 'demo', '1.2.3'), null, 2)}\n`, 'utf8');
  const receipt = buildReceipt({id: 'demo', version: '1.2.3', zipBuffer, manifest, manifestBytes, source});

  const status = await publishReceipt(client, {receipt, zipBuffer, manifestBytes, fetchJsonImpl: fakeFetchJson(store)});

  assert.equal(status, 'published');
  assert.deepEqual(puts, [
    'packages/demo/1.2.3/demo-1.2.3.zip',
    'packages/demo/1.2.3/module.json',
    'packages/_receipts/demo/1.2.3.json',
  ]);
  assert.ok(!puts.includes('index.json'), 'publisher must never PUT index.json');
  assert.deepEqual(JSON.parse(store.get('packages/_receipts/demo/1.2.3.json').toString('utf8')), receipt);
});

test('publishReceipt replays identical bytes idempotently', async () => {
  const {store, puts, client} = fakeOss();
  const zipBuffer = zipWithRootModuleJson();
  const manifestBytes = Buffer.from(`${JSON.stringify(rewriteManifest(manifest, 'demo', '1.2.3'), null, 2)}\n`, 'utf8');
  const receipt = buildReceipt({id: 'demo', version: '1.2.3', zipBuffer, manifest, manifestBytes, source});
  const fetchJson = fakeFetchJson(store);

  assert.equal(await publishReceipt(client, {receipt, zipBuffer, manifestBytes, fetchJsonImpl: fetchJson}), 'published');
  const writes = puts.length;
  assert.equal(await publishReceipt(client, {receipt, zipBuffer, manifestBytes, fetchJsonImpl: fetchJson}), 'already-published');
  assert.equal(puts.length, writes, 'replay must not upload again');
});

test('publishReceipt rejects different bytes at an existing receipt', async () => {
  const {store, puts, client} = fakeOss();
  const zipBuffer = zipWithRootModuleJson();
  const manifestBytes = Buffer.from(`${JSON.stringify(rewriteManifest(manifest, 'demo', '1.2.3'), null, 2)}\n`, 'utf8');
  const receipt = buildReceipt({id: 'demo', version: '1.2.3', zipBuffer, manifest, manifestBytes, source});
  store.set('packages/_receipts/demo/1.2.3.json', Buffer.from(JSON.stringify({...receipt, sha256: 'f'.repeat(64)})));

  await assert.rejects(
    () => publishReceipt(client, {receipt, zipBuffer, manifestBytes, fetchJsonImpl: fakeFetchJson(store)}),
    /receipt exists with different bytes/,
  );
  assert.deepEqual(puts, []);
});

test('publishReceipt rejects manifest bytes that do not match the receipt', async () => {
  const {store, client} = fakeOss();
  const zipBuffer = zipWithRootModuleJson();
  const receipt = buildReceipt({id: 'demo', version: '1.2.3', zipBuffer, manifest, source});
  await assert.rejects(
    () => publishReceipt(client, {receipt, zipBuffer, manifestBytes: Buffer.from('{}'), fetchJsonImpl: fakeFetchJson(store)}),
    /manifest bytes do not match/,
  );
});

test('putImmutable replays identical bytes idempotently and rejects different bytes', async () => {
  const buffer = Buffer.from('payload');
  const makeClient = (storedBytes, lengthOverride) => ({
    async put() { throw Object.assign(new Error('exists'), {code: 'FileAlreadyExists', status: 409}); },
    async head() { return {res: {headers: {'content-length': String(lengthOverride ?? storedBytes.length)}}}; },
    async get() { return {content: storedBytes}; },
  });
  await putImmutable(makeClient(buffer), 'packages/demo/1/demo.zip', buffer, 'application/zip');
  await assert.rejects(() => putImmutable(makeClient(Buffer.from('other')), 'packages/demo/1/demo.zip', buffer, 'application/zip'), /different bytes/);
  await assert.rejects(() => putImmutable(makeClient(buffer, 99), 'packages/demo/1/demo.zip', buffer, 'application/zip'), /different bytes/);
});

async function planFixture(t) {
  const id = 'sheetshare-mobile';
  const moduleJson = JSON.parse(await readFile(path.resolve(import.meta.dirname, '../modules', id, 'module.json'), 'utf8'));
  const version = String(moduleJson.version);
  const [major, minor, patch] = version.split('.').map(Number);
  const older = `${major}.${minor}.${patch - 1}`;
  const ahead = `${major}.${minor}.${patch + 1}`;
  const dist = await mkdtemp(path.join(os.tmpdir(), 'cn-mirror-plan-'));
  t.after(() => rm(dist, {recursive: true, force: true}));
  const zipBuffer = zipWithRootModuleJson(moduleJson);
  await writeFile(path.join(dist, `${id}-${version}.zip`), zipBuffer);
  return {
    id,
    version,
    older,
    ahead,
    dist,
    table: {modules: {[id]: {cnMirror: true, artifact: 'build', reason: 'test fixture'}}},
    index: packages => ({generated: '2026-01-01T00:00:00+00:00', packages, profiles: []}),
    receipt: () => buildReceipt({id, version, zipBuffer, manifest: moduleJson, source}),
    zipSha: sha256(zipBuffer),
  };
}

test('planFor reports awaiting-index when a receipt exists and the index is behind', async t => {
  const fixture = await planFixture(t);
  const decisions = await planFor(fixture.table, fixture.index([{id: fixture.id, version: fixture.older, group: 'arcane'}]), {
    dist: fixture.dist,
    probeReceipt: async () => fixture.receipt(),
  });
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].action, 'awaiting-index');
  assert.match(decisions[0].reason, /ops reconcile pending/);
  assert.equal(decisions[0].version, fixture.version);
});

test('planFor reports awaiting-index when a not-yet-mirrored version already has a receipt', async t => {
  const fixture = await planFixture(t);
  const decisions = await planFor(fixture.table, fixture.index([]), {
    dist: fixture.dist,
    probeReceipt: async () => fixture.receipt(),
  });
  assert.equal(decisions[0].action, 'awaiting-index');
});

test('planFor publishes only when no receipt exists', async t => {
  const fixture = await planFixture(t);
  const decisions = await planFor(fixture.table, fixture.index([{id: fixture.id, version: fixture.older, group: 'arcane'}]), {
    dist: fixture.dist,
    probeReceipt: async () => null,
  });
  assert.equal(decisions[0].action, 'publish');
  assert.match(decisions[0].reason, /upgrade/);
});

test('planFor alarms on a receipt with different bytes instead of republishing', async t => {
  const fixture = await planFixture(t);
  const decisions = await planFor(fixture.table, fixture.index([{id: fixture.id, version: fixture.older, group: 'arcane'}]), {
    dist: fixture.dist,
    probeReceipt: async () => ({...fixture.receipt(), sha256: 'f'.repeat(64)}),
  });
  assert.equal(decisions[0].action, 'alarm');
  assert.match(decisions[0].reason, /receipt exists with different bytes/);
});

test('planFor keeps the index-ahead alarm and never probes a receipt for it', async t => {
  const fixture = await planFixture(t);
  const decisions = await planFor(fixture.table, fixture.index([{id: fixture.id, version: fixture.ahead, group: 'arcane'}]), {
    dist: fixture.dist,
    probeReceipt: async () => { throw new Error('should not probe'); },
  });
  assert.equal(decisions[0].action, 'alarm');
  assert.match(decisions[0].reason, /is ahead of source/);
});

test('planFor alarms when the receipt probe fails', async t => {
  const fixture = await planFixture(t);
  const decisions = await planFor(fixture.table, fixture.index([]), {
    dist: fixture.dist,
    probeReceipt: async () => { throw new Error('network down'); },
  });
  assert.equal(decisions[0].action, 'alarm');
  assert.match(decisions[0].reason, /receipt probe failed: network down/);
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
