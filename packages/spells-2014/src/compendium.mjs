import {hashString} from '@arcanedesk/automation-contracts/semantics';
import {bindSpellContent} from './bind-content.mjs';
import {previewSpellSources} from './sources.mjs';

export const SPELL_MODULE_ID = 'arcane-spells-2014';
const packPattern = /^world\.[A-Za-z0-9_-]+$/;
const clone = value => structuredClone(value);
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().filter(key => key !== '_stats')
    .map(key => [key, canonical(value[key])]));
}
const digest = value => hashString(JSON.stringify(canonical(value)));
const owner = item => item?.flags?.[SPELL_MODULE_ID]?.generated;

/** Prepare all output before any world writes. Missing/ambiguous sources are
 * reported individually. Existing source packs, Actors and user items are untouched.
 * The host must verify runtime/resource availability before offering confirmation.
 */
export function prepareSpellCompendium({documents, plans, sourcePack, targetPack, existing = [],
  sourceRuleset, identities = {}, ddbIdentities = {}, summonProfiles = {}, generationId}) {
  if (!packPattern.test(targetPack) || sourcePack === targetPack) throw new Error('Invalid output compendium');
  if (typeof sourcePack !== 'string' || !sourcePack || typeof generationId !== 'string' || !generationId) {
    throw new Error('Source pack and generation ID are required');
  }
  const byId = new Map(existing.map(item => [item._id, item]));
  if (byId.size !== existing.length) throw new Error('Duplicate output document IDs');
  if (existing.some(item => owner(item)?.generationId === generationId)) throw new Error('Generation ID must be fresh');
  const catalogue = plans.map(plan => ({id: plan.definitionId, level: plan.contract.level}));
  const bySpell = new Map(plans.map(plan => [plan.definitionId, plan]));
  const preview = previewSpellSources({documents, catalogue, sourceRuleset, identities, ddbIdentities});
  const rows = [], writes = [];
  for (const row of preview.rows) {
    if (row.status !== 'matched') {rows.push(row); continue;}
    const id = hashString(`${SPELL_MODULE_ID}:${row.id}`).slice(0, 16);
    const current = byId.get(id);
    const duplicate = existing.some(item => item._id !== id && owner(item)?.spellId === row.id);
    if (duplicate || (current && (owner(current)?.schemaVersion !== 1 || owner(current)?.spellId !== row.id))) {
      rows.push({...row, status: 'conflict', reason: 'output-ownership-conflict'}); continue;
    }
    const bound = bindSpellContent({source: documents[row.index], plan: bySpell.get(row.id),
      target: {_id: id, ownership: clone(current?.ownership ?? {default: 2}),
        ...(current?.folder ? {folder: current.folder} : {}), sort: current?.sort ?? 0},
      bindings: {documentUuid: `Compendium.${targetPack}.Item.${id}`, summonProfiles}, sourceRuleset, identities, ddbIdentities});
    if (bound.status !== 'bound') {
      rows.push({...row, status: bound.status, errors: bound.errors}); continue;
    }
    bound.item.flags[SPELL_MODULE_ID] = {generated: {schemaVersion: 1, spellId: row.id,
      generationId, sourcePack, sourceId: documents[row.index]._id,
      executionPlanHash: bound.receipt.executionPlanHash, contentHash: bound.receipt.contentHash,
      sourceKind: bound.receipt.sourceKind, sourceDefinitionId: bound.receipt.sourceDefinitionId,
      presentationDependencies: bound.receipt.presentationDependencies}};
    const operation = current ? 'update' : 'create';
    writes.push({id, spellId: row.id, operation, expected: current ? digest(current) : null, item: bound.item});
    rows.push({...row, status: 'prepared', operation, targetId: id, requirements: bound.requirements});
  }
  return {schemaVersion: 1, sourcePack, targetPack, generationId, rows, writes,
    counts: {prepared: writes.length, skipped: rows.length - writes.length,
      create: writes.filter(write => write.operation === 'create').length,
      update: writes.filter(write => write.operation === 'update').length}};
}

/** Acknowledged writes are recorded separately from uncertain writes. Never rolls
 * back by deleting documents and never retries a potentially committed write.
 * host uses Foundry public document APIs; no source or Actor methods are requested.
 */
export function createCompendiumWriter(host) {
  const active = new Set();
  return async function writePreparedCompendium(prepared) {
    const batch = clone(prepared);
    if (batch.schemaVersion !== 1 || !packPattern.test(batch.targetPack) || batch.sourcePack === batch.targetPack) {
      throw new Error('Invalid generation batch');
    }
    if (active.has(batch.targetPack)) throw new Error('Generation already running for this compendium');
    active.add(batch.targetPack);
    const written = [];
    try {
      if (new Set(batch.writes.map(write => write.id)).size !== batch.writes.length) throw new Error('Duplicate batch writes');
      for (const write of batch.writes) {
        if (!['create', 'update'].includes(write.operation) || write.item?._id !== write.id
          || owner(write.item)?.schemaVersion !== 1 || owner(write.item)?.spellId !== write.spellId
          || owner(write.item)?.generationId !== batch.generationId) throw new Error('Invalid batch ownership');
      }
      await host.assertCanWrite(batch.targetPack);
      // Check the whole batch first, then recheck immediately before each write.
      const check = async write => {
        const current = await host.readItem(batch.targetPack, write.id);
        if ((current ? digest(current) : null) !== write.expected) throw new Error('Output changed since preview');
        if (current && (owner(current)?.schemaVersion !== 1 || owner(current)?.spellId !== write.spellId)) {
          throw new Error('Output document is not owned by this generator');
        }
      };
      for (const write of batch.writes) await check(write);
      for (const write of batch.writes) {
        try {
          await host.assertCanWrite(batch.targetPack);
          await check(write);
        } catch {
          return {status: written.length ? 'partial' : 'rejected', written,
            failed: {id: write.id, code: 'precondition-changed'}, remaining: batch.writes.length - written.length};
        }
        try {
          await host[write.operation === 'create' ? 'createItem' : 'replaceItem'](batch.targetPack, clone(write.item));
          written.push({id: write.id, operation: write.operation});
        } catch {
          let committed = false;
          try {
            const observed = await host.readItem(batch.targetPack, write.id);
            committed = owner(observed)?.generationId === batch.generationId
              && owner(observed)?.spellId === write.spellId;
          } catch { /* Unknown outcome remains indeterminate. */ }
          if (committed) written.push({id: write.id, operation: write.operation, recoveredAcknowledgement: true});
          return {status: committed ? 'partial' : 'indeterminate', written,
            failed: {id: write.id, code: committed ? 'write-acknowledgement-lost' : 'write-outcome-unknown'},
            remaining: batch.writes.length - written.length};
        }
      }
      return {status: 'completed', written, remaining: 0};
    } finally {
      active.delete(batch.targetPack);
    }
  };
}
