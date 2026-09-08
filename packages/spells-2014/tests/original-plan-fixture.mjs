import {compileSpellPlan} from '@arcanedesk/spell-compiler';
import {cleanRoomSpell, spellContract, spellLifetime, instant, graphFragment, publicAction,
  rule, trigger, selected, operation, dice, acceptance} from '@arcanedesk/spell-compiler/dsl';

export function fixture(id) {
  return compileSpellPlan(cleanRoomSpell({id,
    contract: spellContract({ruleset: '2014', level: 1, school: 'evo', components: {verbal: true}, lifetime: spellLifetime(instant())}),
    emission: {contentVersion: 1}, fragments: [graphFragment({id: 'original', actions: [publicAction('cast', 'Original test')],
      rules: [rule({id: 'pulse', on: trigger('action-used', {actionId: 'cast'}),
        targets: [selected('target:cast', {min: 1, max: 1, range: 25})],
        do: [operation('saving-throw', {id: 'save', ability: ['dex'], target: 'target:cast', onSave: 'none'}),
          operation('damage', {id: 'damage', target: 'target:cast', formula: dice(1, 4), damageTypes: ['force'], onSave: 'none'})]})]})],
    accepted: acceptance('Original generation fixture', ['Offline only'], {status: 'pending-runtime'})}));
}
