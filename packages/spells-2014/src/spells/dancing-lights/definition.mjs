import {
  acceptance, cleanRoomSpell, cleanRoomSummonedEntity, concentration, duration,
  enumParameter, graphFragment, operation, parameterValue, publicAction, rule,
  self, spellContract, trigger,
} from '@arcanedesk/spell-compiler/dsl';
import {dancingLightsPool} from '../../resources/light-carrier.mjs';

export default cleanRoomSpell({
  id: 'dancing-lights',
  contract: spellContract({ruleset: '2014', level: 0, school: 'evo',
    components: {verbal: true, somatic: true, material: true},
    lifetime: concentration(duration(1, 'minutes'))}),
  emission: {contentVersion: 1},
  support: {level: 'simplified', omissions: [
    'DM 在原生 TokenPlacement 中放置光球，判断施法距离、视线、球间距离和布局；玩家随后手动拖动光球，DM 判断附赠动作与移动距离，越界时手动删除。',
    '合并形态由 DM 将同次施法的既有光球移到同格并调整显示；拆分时拖开原有光球，不复制实体。颜色、外形和遮盖由 DM 处理。',
    '光球仅为照明载体，不参与战斗；DM 不将其选作生物目标。最后一球手删后若留下空专注，DM 从角色卡结束专注。',
    '原生放置在 GM 页面完成。唯一在线普通玩家 OWNER 获得生成后的控制权；多个 OWNER 时由 DM 分配，不猜测控制者。',
  ]},
  fragments: [graphFragment({
    id: 'dancing-lights-graph',
    actions: [publicAction('cast', '舞光术 Dancing Lights', {parameters: [
      enumParameter('light-count', dancingLightsPool.choices.map(c => c.choice), {
        defaultValue: '4',
        labels: Object.fromEntries(dancingLightsPool.choices.map(c => [c.choice, c.label])),
      }),
    ]})],
    artifacts: [cleanRoomSummonedEntity('dancing-lights-carriers', {
      pool: dancingLightsPool, selection: parameterValue('light-count'), combat: 'none',
      rulesModel: 'dnd5e-2014-simplified',
      cleanup: {expiry: 'concentration-effect', fallback: 'dm'},
    })],
    rules: [rule({id: 'cast-dancing-lights', on: trigger('action-used', {actionId: 'cast'}),
      targets: [self('target:cast')],
      do: [operation('create-artifact', {id: 'create-lights', artifactId: 'dancing-lights-carriers', target: 'source'})],
    })],
  })],
  accepted: acceptance('packages/spells-2014/README.md#cantrip-runtime-acceptance', [
    'Selected 1–4 native placements create independent unlinked light carriers without spell-slot consumption or Combatants.',
    'Real dim light follows movement and walls; owner permissions and concentration cleanup are verified for multiple sources.',
    'UI and Context invoke the same emitted Activity; partial placement does not replay or replace missing members.',
  ], {status: 'compiler-runtime-passed'}),
});
