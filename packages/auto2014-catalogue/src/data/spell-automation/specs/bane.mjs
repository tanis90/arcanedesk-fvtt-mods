import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  add,
  allAttackRolls,
  allSavingThrows,
  bonus,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  dice,
  duration,
  eventTarget,
  graphFragment,
  levelsAboveBase,
  multiply,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const banePenalty = multiply(
  constant(-1),
  dice(1, 4),
);

const bane = cleanRoomSpell({
  id: "bane",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 6 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "bane-graph",
      actions: [publicAction("cast", "灾祸术 Bane")],
      artifacts: [
        cleanRoomEffect("bane", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Bane",
          modifiers: [
            bonus(allAttackRolls(), banePenalty),
            bonus(allSavingThrows(), banePenalty),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-bane",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: add(constant(3), levelsAboveBase()),
              range: 30,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["cha"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "initial-save-failed",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "apply-bane",
              artifactId: "bane",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "一环最多三个 30 ft 内声明目标分别进行 Charisma save，每升一环可多声明一个目标",
    "只有失败目标的所有攻击检定与豁免减去 1d4，成功目标与非目标不受影响",
    "成功施法只消耗一个所声明环位的法术位并建立最长一分钟的专注",
    "专注结束时清理全部 Bane 目标效果",
  ], { status: "compiler-runtime-passed" }),
});

export default bane;
