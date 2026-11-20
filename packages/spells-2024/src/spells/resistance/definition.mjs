import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  duration,
  endSourceWhenLastDependentEnds,
  enumParameter,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 A 桶 desc-diff-flag）：2024 改为选定伤害类型后每次
// 受到该类型伤害时总伤害减 1d4（每回合一次），2014 是一次豁免 +1d4。
// 5R 锚点：5R 玩家手册2024 0环.htm#Resistance。
const resistanceTypes = [
  "acid", "bludgeoning", "cold", "fire", "lightning", "necrotic",
  "piercing", "poison", "radiant", "slashing", "thunder",
];

const resistance = cleanRoomSpell({
  id: "resistance",
  contract: spellContract({
    ruleset: "2024",
    level: 0,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "2024 的核心减伤条款（每次受到所选类型伤害时总伤害减 1d4，每回合限一次）没有可用的 incoming-damage-reduction 原语，未自动化，由 DM 处理",
      "所选伤害类型只记录在 action 参数上，不写入 Effect；系统不会据此自动计算减伤",
      "目标自愿性未校验：willing 只记录 DM 声明，不由 runtime 推断",
    ],
  },
  fragments: [
    graphFragment({
      id: "resistance-graph",
      actions: [
        publicAction("cast", "抵抗术 Resistance", {
          parameters: [enumParameter("damageType", resistanceTypes, {
            labels: {
              acid: "强酸 Acid",
              bludgeoning: "钝击 Bludgeoning",
              cold: "寒冷 Cold",
              fire: "火焰 Fire",
              lightning: "闪电 Lightning",
              necrotic: "暗蚀 Necrotic",
              piercing: "穿刺 Piercing",
              poison: "毒素 Poison",
              radiant: "光耀 Radiant",
              slashing: "挥砍 Slashing",
              thunder: "雷鸣 Thunder",
            },
          })],
        }),
      ],
      artifacts: [
        cleanRoomEffect("resistance-marker", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Resistance",
          markerOnly: true,
          modifiers: [],
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-resistance",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
              predicates: [predicate("willing")],
            }),
          ],
          do: [
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "resistance-marker",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 触碰一个由 DM 声明为 willing 的 creature，建立最长一分钟的专注；戏法不消耗法术位",
    "施法时从 11 种伤害类型中选择一种，作为 action 参数记录在施法回执上",
    "目标获得一个来源绑定的可见 Resistance marker；重复施法 replace 而不叠加",
    "每回合一次、受到所选类型伤害减 1d4 的机械效果未自动化，保持明确 omission，不以 half-damage resistance 冒充",
    "专注结束或来源被清理时删除目标 marker，非目标不变",
  ], { status: "compiler-passed" }),
});

export default resistance;
