import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  defaultTargetSelection,
  duration,
  grantAbilitySavingThrowAdvantage,
  grantDeathSavingThrowAdvantage,
  graphFragment,
  maximizeHealingReceived,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const beaconOfHope = cleanRoomSpell({
  id: "beacon-of-hope",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 5 },
  support: {
    level: "simplified",
    omissions: [
      "Midi evaluates maximum healing from the workflow's first target; mixed affected and unaffected targets in one multi-target heal are not isolated per target",
      "Midi classifies temporary-HP activities as healing, so its maximum-healing provider flag can also maximize a temporary-HP roll",
    ],
  },
  fragments: [
    graphFragment({
      id: "beacon-of-hope-graph",
      actions: [
        publicAction("cast", "希望信标 Beacon of Hope", {
          defaultTargetSelection: defaultTargetSelection({
            cardinality: "any",
            polarity: "helpful",
            targetPolicy: "same-disposition-all",
            timing: "cast",
            includeSelf: true,
          }),
        }),
      ],
      artifacts: [
        cleanRoomEffect("beacon-of-hope", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Beacon of Hope",
          modifiers: [
            grantAbilitySavingThrowAdvantage("wis"),
            grantDeathSavingThrowAdvantage(),
            maximizeHealingReceived(),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-beacon-of-hope",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: "any",
              range: 30,
              units: "ft",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-beacon-of-hope",
              artifactId: "beacon-of-hope",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "action 可选择 30 ft 内任意数量的 creature；省略目标时默认选择同阵营目标并包含施法者",
      "每个目标的 Wisdom saving throws 与 death saving throws 获得优势",
      "单目标或所有目标都受本法术影响的普通 HP healing workflow 取得最大治疗值",
      "只消耗一个三环或更高环位的法术位并建立最长一分钟的专注",
      "专注结束或持续时间到期时精确清理全部来源绑定效果，非目标不变",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default beaconOfHope;
