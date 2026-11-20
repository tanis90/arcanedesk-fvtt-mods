import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  add,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  duration,
  eventTarget,
  grantConditionImmunity,
  graphFragment,
  levelsAboveBase,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellcastingModifier,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 C 桶 recipe-invalid，c-dm）：2024 删除「法术终止时失去剩余临时
// 生命值」；当前 temphp 原语仍按来源清理，差异见 omission，由 DM 在专注结束时保留。
// 5R 锚点：玩家手册2024/法术详述/1环.htm#Heroism。
const heroism = cleanRoomSpell({
  id: "heroism",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "2024 起法术终止不会收回剩余临时生命值，但当前 temporary-HP source 契约会在来源 effect 删除时清理；DM 需在专注结束时保留这些临时生命值（或先手动提高为同一数值）",
      "目标是否自愿由 DM 判断；selected-targets 不校验意愿",
    ],
  },
  fragments: [
    graphFragment({
      id: "heroism-graph",
      actions: [publicAction("cast", "英雄气概 Heroism")],
      artifacts: [
        cleanRoomEffect("heroism", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Heroism",
          modifiers: [grantConditionImmunity("frightened")],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-heroism",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: add(constant(1), levelsAboveBase()),
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-heroism",
              artifactId: "heroism",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "refresh-heroism-at-turn-start",
          on: trigger("turn-start", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "heroism",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:heroic")],
          do: [
            operation("grant-temporary-hp", {
              id: "refresh:temporary-hp",
              target: "target:heroic",
              formula: spellcastingModifier(),
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "一环接触一个声明目标，每升一环增加一个目标，并只消耗一个所声明环位的法术位",
      "所有声明目标获得 frightened immunity，并由施法者专注管理最长一分钟",
      "施法时不授予 temporary HP；每个受术目标只在自己的回合开始时获得同一来源施法者的 spellcasting modifier temporary HP",
      "每次回合开始刷新不叠加且不再次消耗资源；升环只增加目标数，不增加 temporary HP",
      "2024 的「法术终止不收回剩余临时生命值」是保持明确 omission 的条款：来源清理后由 DM 保留该数值",
    ],
    { status: "compiler-passed" },
  ),
});

export default heroism;
