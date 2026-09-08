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

const heroism = cleanRoomSpell({
  id: "heroism",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 7 },
  support: {
    level: "simplified",
    omissions: [
      "Foundry 的 temporary HP 没有来源标签；若其他来源覆盖本法术提供的 temporary HP，法术结束时剩余数值的精确归属由 DM 裁定",
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
      "专注结束时精确清理 Heroism effect；未被其他来源覆盖的本法术 temporary HP 随之结束",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default heroism;
