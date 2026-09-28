import {initializeSpellRuntime} from 'arcane-generated:runtime';
import {installSpellScripts} from 'arcane-generated:scripts';
import plans from 'arcane-generated:plans';
import {createRuntimeAvailability} from '@arcanedesk/spell-runtime/availability';
import {createFoundryCompendiumHost} from '@arcanedesk/spells-2014/foundry-compendiums';
import {createSpellGeneratorDialog} from '@arcanedesk/spells-2014/generator-dialog';

const MODULE_ID = 'arcane-spells-2014';
const runtime = initializeSpellRuntime({moduleId: MODULE_ID});
try {
  if (runtime.mode === 'standalone') installSpellScripts();
} catch (error) {
  runtime.abortInitialization?.();
  throw error;
}
let generator;
function openGenerator() {
  if (!game.ready) throw new Error('Wait until the world is ready');
  generator ??= createSpellGeneratorDialog({game, Dialog: foundry.applications.api.DialogV2, plans,
    host: createFoundryCompendiumHost({game, ItemClass: CONFIG.Item.documentClass,
      CompendiumCollection: foundry.documents.collections.CompendiumCollection}),
    checkAvailability: createRuntimeAvailability({game, runtime})});
  return generator();
}

Hooks.once('init', () => {
  class SpellGeneratorMenu extends foundry.applications.api.ApplicationV2 {
    async render() {
      try {await openGenerator();} catch (error) {ui.notifications.error(error.message);}
      return this;
    }
  }
  game.settings.registerMenu(MODULE_ID, 'generate', {name: 'Generate Arcane spell compendium',
    label: 'Choose source and preview', hint: 'Use existing SRD 2014 or imported spell descriptions.',
    icon: 'fas fa-wand-magic-sparkles', type: SpellGeneratorMenu, restricted: true});
});

Hooks.once('ready', () => {
  const module = game.modules.get(MODULE_ID);
  module.api = {...module.api, openGenerator, runtime,
    getCoverage: () => plans.map(plan => ({id: plan.definitionId, level: plan.contract.level, support: structuredClone(plan.support)}))};
});
