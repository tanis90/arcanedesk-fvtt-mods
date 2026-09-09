import {prepareSpellCompendium, createCompendiumWriter, SPELL_MODULE_ID} from './compendium.mjs';
import {describeSourceCompendium, materializeSourceDocument} from './foundry-compendiums.mjs';

const html = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));

/** Native Foundry dialog flow. Merely importing this file registers no hooks.
 * checkAvailability must verify the selected runtime and actual resource provider.
 */
export function createSpellGeneratorDialog({game, Dialog, host, plans, checkAvailability,
  resolveResourceBindings = async () => ({}),
  newGenerationId = () => globalThis.crypto.randomUUID()}) {
  if (typeof checkAvailability !== 'function') throw new Error('Runtime availability checker is required');
  const write = createCompendiumWriter(host);
  let running = false;
  return async function openSpellGenerator() {
    if (!game.user?.isGM) throw new Error('Only a GM can generate a spell compendium');
    if (running) throw new Error('The spell generator is already open');
    running = true;
    try {
      const choices = [...game.packs.values()].map(pack => describeSourceCompendium(pack, game.system.id))
        .filter(source => source && !game.packs.get(source.id).metadata?.flags?.[SPELL_MODULE_ID]?.generated)
        .sort((a, b) => Number(b.kind === 'srd-2014') - Number(a.kind === 'srd-2014') || a.id.localeCompare(b.id));
      if (!choices.length) throw new Error('No readable Item compendium is available');
      const selection = await Dialog.prompt({window: {title: 'Generate Arcane spell compendium'}, rejectClose: false,
        content: `<p>Choose existing spell content. The default SRD 2014 source needs no D&D Beyond account.</p>
          <div class="form-group"><label>Source compendium</label><select name="source">${choices.map(source => `<option value="${html(source.id)}">${html(source.label)}${source.kind === 'srd-2014' ? ' — SRD 2014' : ''}</option>`).join('')}</select></div>
          <div class="form-group"><label>Rules</label><select name="rules"><option value="">Use verified source metadata</option><option value="2014">This source uses 2014 rules</option></select></div>
          <div class="form-group"><label>Output compendium name</label><input name="target" value="arcane-spells-2014" pattern="[A-Za-z0-9_-]+" required></div>
          <p>Descriptions stay local. Source compendiums and existing characters are not updated.</p>`,
        ok: {label: 'Preview', callback: (_event, button) => ({source: button.form.elements.source.value,
          rules: button.form.elements.rules.value, target: button.form.elements.target.value})}});
      if (!selection) return {status: 'cancelled'};
      const chosen = choices.find(source => source.id === selection.source);
      if (!chosen || !/^[A-Za-z0-9_-]+$/.test(selection.target)) throw new Error('Invalid source or output selection');
      const targetPack = `world.${selection.target}`;
      const source = game.packs.get(chosen.id);
      const existingPack = game.packs.get(targetPack);
      if (existingPack) await host.assertCanWrite(targetPack);
      const documents = (await source.getDocuments({type: 'spell'})).map(document => materializeSourceDocument(document, source));
      const existing = existingPack ? (await existingPack.getDocuments()).map(document => document.toObject()) : [];
      const batch = prepareSpellCompendium({documents, plans, sourcePack: chosen.id, targetPack, existing,
        summonProfiles: await resolveResourceBindings(),
        sourceRuleset: selection.rules || chosen.sourceRuleset || undefined,
        identities: chosen.identities, generationId: newGenerationId()});
      // Only the configured provider can supply resource bindings. Availability
      // rechecks its installed documents both here and after confirmation.
      for (const row of batch.rows.filter(row => row.status === 'prepared')) {
        const availability = await checkAvailability(row.requirements);
        if (availability?.available !== true) {
          row.status = 'unavailable'; row.reason = availability?.reason ?? 'Required runtime is unavailable';
          batch.writes = batch.writes.filter(write => write.id !== row.targetId);
        }
      }
      const previewHtml = `<p>${batch.writes.length} spells can be generated; ${batch.rows.length - batch.writes.length} skipped.</p>
        <p>Output: ${html(targetPack)}. Drag generated spells from this compendium onto a character sheet.</p>
        <div style="max-height:22rem;overflow:auto"><table><thead><tr><th>Spell</th><th>Result</th></tr></thead><tbody>${batch.rows.map(row => `<tr><td>${html(row.name)}</td><td>${html(row.status === 'prepared' ? row.operation : row.reason ?? row.errors?.map(error => error.code).join(', ') ?? row.status)}</td></tr>`).join('')}</tbody></table></div>`;
      if (!batch.writes.length) {
        await Dialog.prompt({window: {title: 'No spells ready to generate'}, content: previewHtml, rejectClose: false, ok: {label: 'Close'}});
        return {status: 'nothing-to-write', rows: batch.rows};
      }
      const confirmed = await Dialog.confirm({window: {title: 'Review Arcane spell generation'}, content: previewHtml,
        rejectClose: false, yes: {label: 'Generate compendium'}, no: {label: 'Cancel'}});
      if (!confirmed) return {status: 'cancelled'};
      // Recheck runtime availability after confirmation, before creating a pack.
      for (const row of batch.rows.filter(row => row.status === 'prepared')) {
        if ((await checkAvailability(row.requirements))?.available !== true) throw new Error('Runtime availability changed; preview again');
      }
      await host.ensureOutput(selection.target);
      const result = await write(batch);
      await Dialog.prompt({window: {title: 'Arcane spell generation result'}, rejectClose: false, ok: {label: 'Close'},
        content: `<p>${html(result.status)}: ${result.written.length} writes acknowledged; ${result.remaining} remaining.</p>
          ${result.status === 'completed' ? '<p>Open the Arcane compendium and drag a spell onto a character sheet. Consult its support limitations before use.</p>' : '<p>Generation stopped. Preview again to reconcile the output before continuing.</p>'}`});
      return result;
    } finally {running = false;}
  };
}
