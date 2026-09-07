import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  defaultTargetSelection,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const inciteGreed = cleanRoomSpell({
  id: "incite-greed",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 50,
      consumed: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 5 },
  support: {
    level: "simplified",
    omissions: [
      "默认选敌会检查目标能看见施法者；DM 显式声明的目标是否满足可见性仍由 DM 判断",
      "受影响生物在其回合朝施法者移动及仅可使用 Dash 的行为仍由 DM 执行",
      "施法者或盟友伤害受影响生物时提前结束效果仍由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "incite-greed-graph",
      actions: [
        publicAction("cast", "鼓动贪欲 Incite Greed", {
          defaultTargetSelection: defaultTargetSelection({
            cardinality: "any",
            polarity: "harmful",
            targetPolicy: "opposing-disposition-all",
            timing: "cast",
            includeSelf: false,
            requiresTargetCanSeeSource: true,
          }),
        }),
      ],
      artifacts: [
        cleanRoomEffect("incite-greed", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Incite Greed",
          modifiers: [grantStatus("charmed")],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-incite-greed",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: "any",
              range: 30,
              kind: "creature",
              predicates: [
                predicate("can-see-source"),
              ],
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["wis"],
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
              id: "apply-incite-greed",
              artifactId: "incite-greed",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "repeat-save-at-turn-end",
          on: trigger("turn-end", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "incite-greed",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:charmed")],
          do: [
            operation("saving-throw", {
              id: "repeat-save",
              ability: ["wis"],
              target: "target:charmed",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "repeat-save-succeeded",
          on: trigger("operation-outcome", {
            operationId: "repeat-save",
            outcome: "success",
          }),
          targets: [eventTarget("target:released")],
          do: [
            operation("delete-artifact", {
              id: "remove-incite-greed",
              artifactId: "incite-greed",
              target: "target:released",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "harmful 默认覆盖 30 ft 内能看见施法者的敌军；DM 仍可显式声明其他合格目标",
    "每个目标分别进行 Wisdom save，只有失败者获得 charmed",
    "目标回合结束时自动进行免费重复豁免",
    "重复豁免成功、专注结束或持续时间结束时移除 Incite Greed",
  ], { status: "compiler-runtime-passed" }),
});

export default inciteGreed;
