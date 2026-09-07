import {
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

const L5_WAVE_I1_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wave-i1-qa-2026-08-26.md";

const holdMonster = cleanRoomSpell({
  id: "hold-monster",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "undead 不受本法术影响；当前自动化不自行推断 creature type，由 DM 在声明目标时排除 undead",
    ],
  },
  fragments: [
    graphFragment({
      id: "hold-monster-graph",
      actions: [publicAction("cast", "定身怪物 Hold Monster")],
      artifacts: [
        cleanRoomEffect("held", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Hold Monster",
          modifiers: [
            grantStatus("paralyzed"),
            grantStatus("incapacitated"),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-hold-monster",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: add(constant(1), levelsAboveBase()),
              range: 90,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
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
  accepted: acceptance(L5_WAVE_I1_QA_RECEIPT, [
    "五环对 90 ft 内一个由 DM 明确声明为可见且非 undead 的 creature 进行 Wisdom save；每高一环可多声明一个目标",
    "只有首次豁免失败的目标获得 paralyzed 与 incapacitated，成功目标和非目标保持不变",
    "受影响目标在自己回合结束时进行一次不消耗法术位的 Wisdom save，成功后只移除本来源效果",
    "一次施法只消耗一个明确声明的五环或更高法术位，并建立最长一分钟的专注",
    "专注或持续时间结束时清理本来源仍存在的 Hold Monster 效果，其他来源不变",
    "undead 资格保持明确 DM omission，不把声明输入误报为系统 creature-type 强制校验",
  ], { status: "compiler-runtime-passed" }),
});

export default holdMonster;
