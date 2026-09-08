import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
  dice,
  duration,
  endSourceWhenLastDependentEnds,
  eventTarget,
  grantStatus,
  graphFragment,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const phantasmalKiller = cleanRoomSpell({
  id: "phantasmal-killer",
  contract: spellContract({
    ruleset: "2014",
    level: 4,
    school: "ill",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  content: contentRef("phantasmal-killer"),
  emission: { contentVersion: 1 },
  support: {
    level: "full",
    omissions: [],
  },
  fragments: [
    graphFragment({
      id: "phantasmal-killer-graph",
      actions: [publicAction("cast", "魅影杀手 Phantasmal Killer")],
      artifacts: [
        cleanRoomEffect("phantasmal-killer", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Phantasmal Killer",
          modifiers: [grantStatus("frightened")],
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-phantasmal-killer",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 120,
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
              id: "apply-phantasmal-killer",
              artifactId: "phantasmal-killer",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "repeat-save-at-turn-end",
          on: trigger("turn-end", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "phantasmal-killer",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:frightened")],
          do: [
            operation("saving-throw", {
              id: "repeat-save",
              ability: ["wis"],
              target: "target:frightened",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "repeat-save-failed",
          on: trigger("operation-outcome", {
            operationId: "repeat-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:repeat-failed")],
          do: [
            operation("damage", {
              id: "repeat-save:psychic-damage",
              target: "target:repeat-failed",
              formula: perSlotAboveBase(
                dice(4, 10),
                dice(1, 10),
              ),
              damageTypes: ["psychic"],
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
              id: "remove-phantasmal-killer",
              artifactId: "phantasmal-killer",
              target: "target:released",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 对 120 ft 内一个由 DM 明确声明为施法者可见的 creature 进行首次 Wisdom save，并只消耗一个四环或更高法术位",
    "首次豁免失败的目标获得来源绑定的 frightened 效果；首次豁免成功时目标不改变；首次全数成功时，施法者立即通过受信 Effect UI 结束仍可主动维持的专注（明确 HITL）",
    "受影响目标在自己的每个回合结束时进行一次不消耗法术位的 Wisdom save；失败承受 4d10 psychic damage，每高一环增加 1d10",
    "回合末豁免成功时删除本次来源的 Phantasmal Killer 效果，并在最后一个 dependent 结束后关闭对应来源专注",
    "施法建立最长一分钟的专注；专注结束时清理仍存在的 frightened 效果，其他目标与其他施法来源不变",
  ], { status: "compiler-runtime-passed" }),
});

export default phantasmalKiller;
