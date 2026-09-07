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
  grantStatus,
  graphFragment,
  levelsAboveBase,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const holdPerson = cleanRoomSpell({
  id: "hold-person",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 8 },
  support: {
    level: "simplified",
    omissions: [
      "humanoid 目标资格目前由 DM 在声明目标时判断；编译产物与 CLI 尚不强制 creature-type predicate",
    ],
  },
  fragments: [
    graphFragment({
      id: "hold-person-graph",
      actions: [publicAction("cast", "定身类人 Hold Person")],
      artifacts: [
        cleanRoomEffect("held", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Hold Person",
          modifiers: [
            grantStatus("paralyzed"),
            grantStatus("incapacitated"),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-hold-person",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: add(constant(1), levelsAboveBase()),
              range: 60,
              kind: "creature",
              predicates: [
                predicate("creature-type", { value: "humanoid" }),
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
              id: "apply-held",
              artifactId: "held",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "repeat-save-at-turn-end",
          on: trigger("turn-end", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "held",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:held")],
          do: [
            operation("saving-throw", {
              id: "repeat-save",
              ability: ["wis"],
              target: "target:held",
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
              id: "remove-held",
              artifactId: "held",
              target: "target:released",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "二环对一个由 DM 确认为 humanoid 的 60 ft 内目标进行 Wisdom save，每升一环可多声明一个目标",
    "只有首次豁免失败的目标获得 paralyzed 与 incapacitated",
    "受影响目标在自己回合结束时进行一次不消耗法术位的 Wisdom save，成功后移除效果",
    "成功施法只消耗一个所声明环位的法术位并建立最长一分钟的专注",
    "专注结束时清理全部仍存在的 Hold Person 目标效果",
  ], { status: "compiler-runtime-passed" }),
});

export default holdPerson;
