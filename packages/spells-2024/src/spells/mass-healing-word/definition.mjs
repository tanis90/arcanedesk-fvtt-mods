import {
  QA_LOG,
  acceptance,
  add,
  cleanRoomSpell,
  consume,
  dice,
  graphFragment,
  instant,
  operation,
  perSlotAboveBase,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  spellcastingModifier,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：治疗 1d4→2d4（升环仍 +1d4），
// 学派塑能→防护，且 2024 删除了 2014 的"亡灵与构装无效"限制。
// 5R 锚点：5R 玩家手册2024 3环.htm#Mass_Healing_Word。
const massHealingWord = cleanRoomSpell({
  id: "mass-healing-word",
  contract: spellContract({
    ruleset: "2024",
    level: 3,
    school: "abj",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 6 },
  support: {
    level: "simplified",
    omissions: [
      "2024 要求目标为「你能看见」的生物；selected-targets 不校验可见性、也不校验目标是否在施法者视线内，由 DM 在声明目标时判断",
      "一次施法至多六个目标由 DM 按 5R 声明；系统只校验 1-6 的基数，不推导目标之间的空间关系",
    ],
  },
  fragments: [
    graphFragment({
      id: "mass-healing-word-graph",
      actions: [
        publicAction("cast", "群体治愈真言 Mass Healing Word", {
          activationType: "bonus",
        }),
      ],
      rules: [
        rule({
          id: "cast-mass-healing-word",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 6,
              range: 60,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("healing", {
              id: "cast:healing",
              target: "target:cast",
              formula: perSlotAboveBase(
                add(dice(2, 4), spellcastingModifier()),
                dice(1, 4),
              ),
              healingTypes: ["healing"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "bonus action 选择 60 ft 内一至六个 creature，只消耗一个三环或更高法术位",
    "每个目标恢复 2d4 + 施法属性调整值（2024 口径），每比三环高一环增加 1d4",
    "2024 起不再排除亡灵与构装目标",
    "非目标 HP 不变，不建立专注、持续 Effect 或模板",
    "目标可见性由 DM 在声明目标时确认，不由自动化冒充",
  ], { status: "compiler-passed" }),
});

export default massHealingWord;
