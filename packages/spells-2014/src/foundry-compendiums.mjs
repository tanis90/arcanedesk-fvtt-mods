import {SPELL_MODULE_ID} from '@arcanedesk/spells-2014/compendium';

/** dnd5e may inherit the displayed source book from its compendium. Persist that
 * fallback when moving to a world pack, without changing the source document. */
export function materializeSourceDocument(document, pack) {
  const data = document.toObject();
  const book = pack.metadata?.flags?.dnd5e?.sourceBook;
  if (typeof book === 'string' && book && !data.system?.source?.book) {
    data.system ??= {};
    data.system.source ??= {};
    data.system.source.book = book;
  }
  return data;
}

/** Only this verified system pack supplies an implicit 2014 ruleset. Other
 * sources must identify rules per Item or receive an explicit user selection.
 */
export function describeSourceCompendium(pack, systemId) {
  if (pack.documentName !== 'Item' || pack.visible === false) return null;
  const srd2014 = systemId === 'dnd5e' && pack.collection === 'dnd5e.spells'
    && pack.metadata?.flags?.dnd5e?.sourceBook === 'SRD 5.1';
  return {id: pack.collection, label: pack.title ?? pack.metadata?.label ?? pack.collection,
    kind: srd2014 ? 'srd-2014' : 'existing-items', sourceRuleset: srd2014 ? '2014' : null,
    // Reviewed SRD 5.1 document identities in dnd5e 5.3.3. Display names and
    // normalized 2024 identifiers must not determine a 2014 spell's identity.
    identities: srd2014 ? {
      '7UwUjJ6owIQkEPrs': 'branding-smite',
      'WahI41a3goVUg0x1': 'enlargereduce',
      'zwGsAv6kmwzYGhh3': 'blindnessdeafness',
    } : {}};
}

/** Injected Foundry APIs keep import side-effect free and permit offline checks.
 * Calls happen only when the user operates the generator in a chosen world.
 */
export function createFoundryCompendiumHost({game, ItemClass, CompendiumCollection}) {
  const assertGM = () => {
    if (!game.user?.isGM) throw new Error('Only a GM can generate a spell compendium');
    // A single active GM writes; other clients can still preview source content.
    const primary = [...game.users].filter(user => user.active && user.isGM)
      .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)[0];
    if (primary?.id !== game.user.id) throw new Error('Generate from the primary active GM session');
  };
  const output = id => {
    const pack = game.packs.get(id);
    if (!/^world\.[A-Za-z0-9_-]+$/.test(id) || !pack || pack.documentName !== 'Item'
      || pack.metadata?.flags?.[SPELL_MODULE_ID]?.generated !== 1) {
      throw new Error('Output must be an Arcane-owned world Item compendium');
    }
    if (pack.locked) throw new Error('Unlock the Arcane output compendium before generating');
    return pack;
  };
  const host = {
    assertCanWrite: async id => {assertGM(); output(id);},
    async ensureOutput(name = 'arcane-spells-2014') {
      assertGM();
      if (!/^[A-Za-z0-9_-]+$/.test(name)) throw new Error('Invalid compendium name');
      const id = `world.${name}`;
      if (game.packs.has(id)) return output(id);
      const pack = await CompendiumCollection.createCompendium({name, label: 'Arcane Spells — 2014',
        type: 'Item', system: 'dnd5e', flags: {[SPELL_MODULE_ID]: {generated: 1}},
        ownership: {PLAYER: 'OBSERVER', ASSISTANT: 'OWNER'}});
      if (pack.collection !== id) throw new Error('Created compendium identity differs from requested target');
      if (pack.locked) await pack.configure({locked: false});
      return output(id);
    },
    async readItem(id, documentId) {
      const pack = output(id);
      // getDocuments performs a database query; do not rely on getDocument's cache.
      const documents = await pack.getDocuments({_id__in: [documentId]});
      if (documents.length > 1) throw new Error('Duplicate document identity');
      return documents[0]?.toObject() ?? null;
    },
    async createItem(id, data) {
      await host.assertCanWrite(id);
      const created = await ItemClass.createDocuments([data], {pack: id, keepId: true});
      if (created.length !== 1 || created[0].id !== data._id) throw new Error('Item creation was not acknowledged');
    },
    async replaceItem(id, data) {
      await host.assertCanWrite(id);
      const current = await host.readItem(id, data._id);
      const generated = current?.flags?.[SPELL_MODULE_ID]?.generated;
      if (generated?.schemaVersion !== 1 || generated.spellId !== data.flags?.[SPELL_MODULE_ID]?.generated?.spellId) {
        throw new Error('Cannot replace a foreign Item');
      }
      const updated = await ItemClass.updateDocuments([data], {pack: id, diff: false, recursive: false});
      if (updated.length !== 1 || updated[0].id !== data._id) throw new Error('Item update was not acknowledged');
    },
  };
  return host;
}
