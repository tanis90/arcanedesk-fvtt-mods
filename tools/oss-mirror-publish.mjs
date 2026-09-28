import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// CN mirror publisher for the arcane-package OSS bucket (Beijing).
// Contract: apps/desktop/distribution/oss-mirror-contract.md (arcanedesk repo).
//
// Differences from the retired desktop-repo CLI edition:
//   - SDK auth (ali-oss) via OSS_ACCESS_KEY_ID/OSS_ACCESS_KEY_SECRET env — CI-friendly,
//     no local aliyun CLI dependency.
//   - index.json updates use If-Match optimistic locking: fetch-merge-put retries on
//     412 so CI publishers and local publishers cannot silently overwrite each other.
//   - immutable objects upload with x-oss-forbid-overwrite.
//   - removal stays a manual arcane-admin operation; this tool only adds and verifies.
//
// CLI: node tools/oss-mirror-publish.mjs add --id <id> --version <v> --group <g> \
//          --zip <path> --manifest <module.json>
//      node tools/oss-mirror-publish.mjs verify

export const BUCKET = 'arcane-package';
export const BASE_URL = 'https://arcane-package.oss-cn-beijing.aliyuncs.com';
export const INDEX_KEY = 'index.json';
export const INDEX_URL = `${BASE_URL}/${INDEX_KEY}`;
const INDEX_CACHE_CONTROL = 'no-cache, max-age=0, must-revalidate';
const OBJECT_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const INDEX_WRITE_ATTEMPTS = 3;

export function ossUrls(id, version) {
  return {
    zipUrl: `${BASE_URL}/packages/${id}/${version}/${id}-${version}.zip`,
    manifestUrl: `${BASE_URL}/packages/${id}/${version}/module.json`,
  };
}

// Mirror manifests must point download/manifest back at this bucket so Foundry
// "install by URL" stays on the mirror end to end.
export function rewriteManifest(manifest, id, version) {
  const urls = ossUrls(id, version);
  return {...manifest, download: urls.zipUrl, manifest: urls.manifestUrl};
}

export function serializeIndexCrlf(index) {
  return `${JSON.stringify(index, null, 2).replace(/\n/g, '\r\n')}\r\n`;
}

function generatedTimestamp() {
  return `${new Date().toISOString().slice(0, 19)}+00:00`;
}

function sortKey(entry) {
  return `${entry.group}/${entry.id}`;
}

export function mergeIndex(index, entry) {
  if (index.packages.some(e => e.id === entry.id && String(e.version) === String(entry.version))) {
    throw Object.assign(new Error(`${entry.id}@${entry.version} already in index (paths are immutable; publish a new version)`), {code: 'IMMUTABLE'});
  }
  const packages = [...index.packages, entry].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1));
  return {...index, generated: generatedTimestamp(), packages};
}

// Read the zip central directory to assert module.json sits at the archive root
// (the mirror unpacking convention).
export function zipRootEntries(buffer) {
  const eocdSig = 0x06054b50;
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 66000); i -= 1) {
    if (buffer.readUInt32LE(i) === eocdSig) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('zip: end-of-central-directory not found');
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const names = [];
  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('zip: central directory signature mismatch');
    const nameLength = buffer.readUInt16LE(offset + 28);
    names.push(buffer.toString('utf8', offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
  return names;
}

export async function createClient(env = process.env) {
  const {default: OSS} = await import('ali-oss');
  return new OSS({
    accessKeyId: env.OSS_ACCESS_KEY_ID,
    accessKeySecret: env.OSS_ACCESS_KEY_SECRET,
    bucket: BUCKET,
    region: env.OSS_REGION || 'oss-cn-beijing',
    endpoint: env.OSS_ENDPOINT,
  });
}

async function fetchIndex(client) {
  const res = await client.get(INDEX_KEY);
  const index = JSON.parse(res.content.toString('utf8'));
  if (!Array.isArray(index.packages)) throw new Error('index.json has no packages[]');
  return {index, etag: res.res?.headers?.etag};
}

export async function putImmutable(client, key, buffer, contentType) {
  try {
    await client.put(key, buffer, {
      headers: {'x-oss-forbid-overwrite': 'true', 'Cache-Control': OBJECT_CACHE_CONTROL},
      mime: contentType,
    });
  } catch (error) {
    // Idempotent replays: retrying a publish whose objects already landed must not
    // fail. OSS rejects any re-put to an existing key (forbid-overwrite), so compare
    // the stored object's ETag (= MD5 for single-part puts) against our bytes.
    if (error?.code === 'FileAlreadyExists' || error?.status === 409) {
      const head = await client.head(key);
      const stored = (head?.res?.headers?.etag || '').replace(/"/g, '');
      const expected = createHash('md5').update(buffer).digest('hex');
      if (stored === expected) return;
      throw new Error(`immutable object exists with different bytes: ${key}`);
    }
    throw error;
  }
}

// mutate(index) -> nextIndex or null (nothing to do).
// Aliyun OSS PutObject has no conditional write (If-Match exists on Get/Head only;
// the 2024 conditional-write feature is If-None-Match:* create-if-absent), so the
// fetch-merge-put cycle is guarded by a post-write read-back instead: every entry of
// the fetched base plus our additions must be present in the index we just overwrote,
// otherwise another writer interleaved and the merge is retried from a fresh fetch.
// Both CI tracks serialize themselves via workflow concurrency groups; the residual
// window is a CI publish racing a local manual publish within the same second.
export async function commitIndex(client, mutate) {
  for (let attempt = 1; attempt <= INDEX_WRITE_ATTEMPTS; attempt += 1) {
    const {index} = await fetchIndex(client);
    const next = await mutate(index);
    if (!next) return null;
    await client.put(INDEX_KEY, Buffer.from(serializeIndexCrlf(next), 'utf8'), {
      headers: {'Cache-Control': INDEX_CACHE_CONTROL},
    });
    const {index: after} = await fetchIndex(client);
    const afterIds = new Set(after.packages.map(e => `${e.id}@${e.version}`));
    const survived = index.packages.every(e => afterIds.has(`${e.id}@${e.version}`));
    const landed = next.packages.every(e => afterIds.has(`${e.id}@${e.version}`));
    if (survived && landed) return after;
  }
  throw new Error(`index.json update failed read-back verification ${INDEX_WRITE_ATTEMPTS} times`);
}

export async function addPackage(client, {id, version, group, zipBuffer, manifest}) {
  if (manifest.id !== id) throw new Error(`manifest id "${manifest.id}" != "${id}"`);
  if (String(manifest.version) !== String(version)) {
    throw new Error(`manifest version "${manifest.version}" != "${version}"`);
  }
  const names = zipRootEntries(zipBuffer);
  if (!names.includes('module.json')) {
    throw new Error(`module.json not at zip root (entries: ${names.slice(0, 5).join(', ')}…)`);
  }
  const bytes = zipBuffer.length;
  const sha256 = createHash('sha256').update(zipBuffer).digest('hex');
  const dir = `packages/${id}/${version}`;
  const urls = ossUrls(id, version);

  await putImmutable(client, `${dir}/${id}-${version}.zip`, zipBuffer, 'application/zip');
  await putImmutable(client, `${dir}/module.json`,
    Buffer.from(`${JSON.stringify(rewriteManifest(manifest, id, version), null, 2)}\n`, 'utf8'),
    'application/json');

  await commitIndex(client, index => mergeIndex(index, {id, version, group, bytes, sha256, ...urls}));
  return {id, version, group, bytes, sha256, ...urls};
}

// Anonymous read-path audit over the public bucket: every index entry must HEAD 200
// with matching bytes, its manifest must carry the right id/version, and deep ids get
// a full download + sha256 recheck.
export async function verifyMirror({deep = [], index = null, fetchImpl = fetch} = {}) {
  const resolved = index ?? await (await fetchImpl(INDEX_URL, {cache: 'no-store'})).json();
  const problems = [];
  for (const entry of resolved.packages) {
    for (const [url, expectedBytes] of [[entry.zipUrl, entry.bytes], [entry.manifestUrl, null]]) {
      const res = await fetchImpl(url, {method: 'HEAD', cache: 'no-store'});
      if (!res.ok) problems.push(`${entry.id}@${entry.version}: HEAD ${url} -> HTTP ${res.status}`);
      else if (expectedBytes !== null && Number(res.headers.get('content-length')) !== expectedBytes) {
        problems.push(`${entry.id}@${entry.version}: content-length ${res.headers.get('content-length')} != ${expectedBytes}`);
      }
    }
    const manifest = await (await fetchImpl(entry.manifestUrl, {cache: 'no-store'})).json();
    if (manifest.id !== entry.id || String(manifest.version) !== String(entry.version)) {
      problems.push(`${entry.id}@${entry.version}: manifest id/version mismatch`);
    }
    if (deep.includes(entry.id)) {
      const zip = Buffer.from(await (await fetchImpl(entry.zipUrl, {cache: 'no-store'})).arrayBuffer());
      if (createHash('sha256').update(zip).digest('hex') !== entry.sha256) {
        problems.push(`${entry.id}@${entry.version}: deep sha256 mismatch`);
      }
    }
  }
  if (problems.length) throw new Error(`verification failed: ${problems.length} problem(s)\n${problems.join('\n')}`);
  return resolved.packages.length;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = {};
  for (let i = 0; i < rest.length; i += 2) args[rest[i]?.replace(/^--/, '')] = rest[i + 1];
  if (command === 'verify') {
    console.log(`verified ${await verifyMirror()} packages`);
    return;
  }
  if (command === 'add') {
    const {id, version, group, zip, manifest} = args;
    const zipBuffer = await readFile(zip);
    const manifestObject = JSON.parse(await readFile(manifest, 'utf8'));
    const client = await createClient();
    const entry = await addPackage(client, {id, version, group, zipBuffer, manifest: manifestObject});
    console.log(`published ${entry.id}@${entry.version} (${entry.bytes} bytes, sha256 ${entry.sha256})`);
    console.log(`verified ${await verifyMirror({deep: [id]})} packages`);
    return;
  }
  throw new Error(`unknown command: ${command ?? '(none)'} — expected add | verify`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`error: ${error.message}`); process.exit(1); });
}
