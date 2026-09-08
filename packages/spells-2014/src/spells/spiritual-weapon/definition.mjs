import {
  SUM_NATIVE_QA_LOG,
  acceptance,
  add,
  castLevel,
  cleanRoomSpell,
  cleanRoomSummonedEntity,
  constant,
  consume,
  dice,
  duration,
  enumParameter,
  graphFragment,
  operation,
  parameterValue,
  publicAction,
  rule,
  self,
  spellAttackBonus,
  spellContract,
  spellLifetime,
  spellcastingModifier,
  tiers,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";
import { spiritualWeaponPool } from "../../resources/pools.mjs";

const SUMMON_FORM_PARAMETER = "summon-form";

const summonFormValues = spiritualWeaponPool.choices.map(choice => choice.choice);
const summonFormLabels = Object.fromEntries(
  spiritualWeaponPool.choices.map(choice => [choice.choice, choice.label]),
);

const spiritualWeaponHitPointBonus = tiers([
  { minimum: 2, value: constant(0) },
  { minimum: 4, value: constant(8) },
  { minimum: 6, value: constant(16) },
  { minimum: 8, value: constant(24) },
], castLevel());

const spiritualWeaponAttackDamageBonus = add(
  tiers([
    { minimum: 2, value: dice(1, 8) },
    { minimum: 4, value: dice(2, 8) },
    { minimum: 6, value: dice(3, 8) },
    { minimum: 8, value: dice(4, 8) },
  ], castLevel()),
  spellcastingModifier(),
);

const spiritualWeapon = cleanRoomSpell({
  id: "spiritual-weapon",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "采用 BG3-style 独立法术实体，而不是 2014 RAW 的施法者回合内武器标记：实体获得自己的 Combatant、回合与 bonus-action activities；施法完成时不额外自动攻击，后续活动也不再次消耗施法者的 bonus action 或法术位",
      "落点完全交给 dnd5e 原生 TokenPlacement；DM 按 60 ft、施法者可见、未占据空间、Token footprint、墙体、地形与高度判断最终位置，Arcane 不自动放到施法者身边，也不实现合法格、LOS、碰撞或路径检查",
      "Arcane 薄 sidecar 只为原生返回的 Token 创建独立 Combatant，并 exact 复制触发本次施法的 source Combatant finite initiative；缺失或歧义的 source Combatant 绑定在耗槽前拒绝，不另掷 d20、不把 null 当作 0，也不做正负 0.01 偏移",
      "操作者在灵体武器自己的回合手工移动最多 20 ft，并选择普通攻击或特殊动作；DM 负责确认 5 ft 近战范围、不能借机攻击及场景中的移动合法性",
      "Lacerate 的 Bleeding 回合开始 2 slashing/被治疗移除、Piercing Strike 的 Gaping Wounds 后续命中 +2 piercing、Concussive Smash 的 Dazed AC/反应/Help 移除等复杂持续规则由 DM 手工处理；系统只承诺 Actor 上可点的攻击、固定 Constitution DC 12 与稳定 condition marker/duration",
      "10 回合自然到期或战斗结束时由 DM 手工删除实体；系统不为该低频动作建立回合计时器，但同一施法者重施会在新实体原生创建成功后精确替换旧实体",
    ],
  },
  fragments: [
    graphFragment({
      id: "spiritual-weapon-graph",
      actions: [
        publicAction("cast", "召唤灵体武器 Summon Spiritual Weapon", {
          activationType: "bonus",
          parameters: [
            enumParameter(SUMMON_FORM_PARAMETER, summonFormValues, {
              labels: summonFormLabels,
            }),
          ],
        }),
      ],
      artifacts: [
        cleanRoomSummonedEntity("spiritual-weapon-entity", {
          pool: spiritualWeaponPool,
          selection: parameterValue(SUMMON_FORM_PARAMETER),
          deltaBindings: [
            { slot: "hit-points", value: spiritualWeaponHitPointBonus },
            { slot: "spell-attack-bonus", value: spellAttackBonus() },
            { slot: "activity-damage", value: spiritualWeaponAttackDamageBonus },
          ],
          cleanup: { expiry: "dm-duration" },
          uniqueness: {
            scope: "source-actor-item",
            maximum: 1,
            enforcement: "replace-after-create",
          },
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-spiritual-weapon",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-spiritual-weapon",
              artifactId: "spiritual-weapon-entity",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(SUM_NATIVE_QA_LOG, [
    "角色卡与 turn-context 暴露 Greataxe、Greatsword、Halberd、Maul、Spear、Trident 六个有名称的 Cast activities；每项只绑定对应白名单 profile，非法或缺失 choice 在扣槽前拒绝",
    "一次 bonus-action cast 只消耗一个二环或更高法术位，并经真实 dnd5e SummonActivity 与原生 TokenPlacement 创建 count 1 的非链接实体 Token；施法时不自动攻击，Arcane 不另建 Token、staging、合法格检查或 spawn retry",
    "同一次 execute-turn 在 GM 页面等待 DM 放置一枚原生预览；DM 决定 60 ft 内可见且未占据的最终落点，右键跳过记为 partial-manual，不把跳过、timeout 或不明结果当作失败补生",
    "原生 profile base 20 HP 叠加二/三、四/五、六/七、八/九环的 +0/+8/+16/+24 native HP bonus，得到 20/28/36/44 HP；固定 1 force 的 profile base action 叠加 1/2/3/4d8 + 施法属性调整值 native attack damage bonus，并通过 match attacks 使用施法者实际 spell attack bonus；共享 world base 不随施法者或施法次数变化",
    "六个 profile 只落入 lacerate、concussive-smash、piercing-strike 三个 recipe；普通与特殊 activity 可由实体自己的回合调用，固定 Constitution DC 12 不随施法者变化",
    "Arcane 只对本次原生返回 Token 幂等补齐独立 Combatant，并 exact 复制 source Combatant 的 finite initiative；不产生 initiative roll/chat、null 到 0 或正负 0.01 偏移，也不移动当前 combat cursor",
    "唯一活跃非 GM OWNER 可控制实体；否则保持 GM 操控。重施只在新实体原生创建成功后替换同一 source Actor + Item 的旧实体，不串删其他施法者或其他 profile",
    "DM 按可见 HITL 边界处理移动、近战距离、不能借机攻击、复杂 Bleeding/Gaping Wounds/Dazed 细节，以及 10 回合自然到期删除",
    "completion receipt 报告命名 Activity/profile、expected 1、placed/skipped count、workflow/message UUID、原生 Token UUID、Combatant UUID、source Combatant UUID、inherited initiative、replace lifecycle 与 manual outcome",
  ], { status: "compiler-runtime-passed" }),
});

export default spiritualWeapon;
