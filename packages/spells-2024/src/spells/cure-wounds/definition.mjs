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
  spellcastingModifier,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：治疗 1d8→2d8、升环 +1d8→+2d8、
// 学派塑能→防护；2024 删除了 2014 的"亡灵与构装无效"限制（omission 随之移除）。
// 来源：5R 玩家手册2024 1环.htm#Cure_Wounds。2026-11-14 compat harness 实弹探针通过
// （治疗 10 点 = 2d8+mod 量级，2014 的 1d8 口径到不了），acceptance 升级 runtime-passed。
const cureWounds = cleanRoomSpell({
  id: "cure-wounds",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "2024 文本目标为被触碰的生物（隐含配合）；selected-targets 不校验目标自愿性，由 DM 判断",
    ],
  },
  fragments: [
    graphFragment({
      id: "cure-wounds-graph",
      actions: [publicAction("cast", "疗伤术 Cure Wounds")],
      rules: [
        rule({
          id: "cast-cure-wounds",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("healing", {
              id: "cast:healing",
              target: "target:cast",
              formula: perSlotAboveBase(
                add(dice(2, 8), spellcastingModifier()),
                dice(2, 8),
              ),
              healingTypes: ["healing"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 选择一个 touch 范围内的 creature",
    "目标恢复 2d8 + 施法属性调整值，每升一环增加 2d8（2024 口径）",
    "2024 起不再排除亡灵与构装目标",
    "非目标不变",
    "只消耗一个法术位",
  ], { status: "compiler-runtime-passed" }),
});

export default cureWounds;
