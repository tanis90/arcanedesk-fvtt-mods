import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  add,
  cleanRoomEffect,
  cleanRoomSpell,
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
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const blindnessDeafness = cleanRoomSpell({
  id: "blindnessdeafness",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "nec",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
    primaryActionId: "cast-blindness",
  }),
  emission: { contentVersion: 6 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "blindness-deafness-graph",
      actions: [
        publicAction("cast-blindness", "目盲 Blindness"),
        publicAction("cast-deafness", "耳聋 Deafness"),
      ],
      artifacts: [
        cleanRoomEffect("blindness", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "目盲 Blindness",
          modifiers: [grantStatus("blinded")],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("deafness", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "耳聋 Deafness",
          modifiers: [grantStatus("deafened")],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-blindness",
          on: trigger("action-used", { actionId: "cast-blindness" }),
          targets: [
            selected("target:blindness", {
              min: 1,
              max: add(constant(1), levelsAboveBase()),
              range: 30,
              kind: "creature",
            }),
          ],
          do: [
            consume("blindness:consume"),
            operation("saving-throw", {
              id: "blindness-initial-save",
              ability: ["con"],
              target: "target:blindness",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "blindness-initial-save-failed",
          on: trigger("operation-outcome", {
            operationId: "blindness-initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:blindness-failed")],
          do: [
            operation("apply-artifact", {
              id: "apply-blindness",
              artifactId: "blindness",
              target: "target:blindness-failed",
            }),
          ],
        }),
        rule({
          id: "blindness-repeat-at-turn-end",
          on: trigger("turn-end", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "blindness",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:blinded")],
          do: [
            operation("saving-throw", {
              id: "blindness-repeat-save",
              ability: ["con"],
              target: "target:blinded",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "blindness-repeat-succeeded",
          on: trigger("operation-outcome", {
            operationId: "blindness-repeat-save",
            outcome: "success",
          }),
          targets: [eventTarget("target:blindness-released")],
          do: [
            operation("delete-artifact", {
              id: "remove-blindness",
              artifactId: "blindness",
              target: "target:blindness-released",
            }),
          ],
        }),
        rule({
          id: "cast-deafness",
          on: trigger("action-used", { actionId: "cast-deafness" }),
          targets: [
            selected("target:deafness", {
              min: 1,
              max: add(constant(1), levelsAboveBase()),
              range: 30,
              kind: "creature",
            }),
          ],
          do: [
            consume("deafness:consume"),
            operation("saving-throw", {
              id: "deafness-initial-save",
              ability: ["con"],
              target: "target:deafness",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "deafness-initial-save-failed",
          on: trigger("operation-outcome", {
            operationId: "deafness-initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:deafness-failed")],
          do: [
            operation("apply-artifact", {
              id: "apply-deafness",
              artifactId: "deafness",
              target: "target:deafness-failed",
            }),
          ],
        }),
        rule({
          id: "deafness-repeat-at-turn-end",
          on: trigger("turn-end", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "deafness",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:deafened")],
          do: [
            operation("saving-throw", {
              id: "deafness-repeat-save",
              ability: ["con"],
              target: "target:deafened",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "deafness-repeat-succeeded",
          on: trigger("operation-outcome", {
            operationId: "deafness-repeat-save",
            outcome: "success",
          }),
          targets: [eventTarget("target:deafness-released")],
          do: [
            operation("delete-artifact", {
              id: "remove-deafness",
              artifactId: "deafness",
              target: "target:deafness-released",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "公开入口只有明确命名的目盲与耳聋两个 action，不从缺失声明推断默认效果",
    "两个 action 都按二环一个目标、每升一环多一个目标的上限请求 Constitution save",
    "只有首次豁免失败的目标获得所声明的 blinded 或 deafened，成功目标与非目标不变",
    "受影响目标在自己回合结束时进行一次不消耗法术位的 Constitution save，成功后移除对应状态",
    "一次施法只消耗一个所声明环位的法术位；本法术不建立专注",
  ], { status: "compiler-runtime-passed" }),
});

export default blindnessDeafness;
