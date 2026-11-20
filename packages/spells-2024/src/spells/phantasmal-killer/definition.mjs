import {
  QA_LOG,
  acceptance,
  allAttackRolls,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  endSourceWhenLastDependentEnds,
  eventTarget,
  gainAttackDisadvantage,
  grantAbilityCheckDisadvantage,
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

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：首次豁免失败即受 4d10 心灵伤害
// 并令其所有属性检定与攻击检定具有劣势（成功半伤且法术终止），不再是恐惧效果。
// 5R 锚点：5R 玩家手册2024 4环.htm#Phantasmal_Killer。
const allAbilities = ["str", "dex", "con", "int", "wis", "cha"];

const phantasmalKiller = cleanRoomSpell({
  id: "phantasmal-killer",
  contract: spellContract({
    ruleset: "2024",
    level: 4,
    school: "ill",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "首次豁免成功时 5R 规定法术立即终止；系统不提供「成功即结束施法者专注」的原语，由 DM 手动结束该专注",
      "幻象只对目标可见、目标在持续期间无法以常规手段辨识幻象等叙事条款由 DM 处理",
    ],
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
          modifiers: [
            gainAttackDisadvantage(allAttackRolls()),
            grantAbilityCheckDisadvantage(allAbilities),
          ],
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
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(4, 10),
                dice(1, 10),
              ),
              damageTypes: ["psychic"],
              onSave: "half",
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
          targets: [eventTarget("target:afflicted")],
          do: [
            operation("saving-throw", {
              id: "repeat-save",
              ability: ["wis"],
              target: "target:afflicted",
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
    "action 对 120 ft 内一个由 DM 声明为施法者可见的 creature 进行首次 Wisdom save，只消耗一个四环或更高法术位",
    "首次豁免失败的目标承受 4d10 psychic damage，并获得到法术结束为止所有属性检定与攻击检定的劣势；豁免成功只承受一半伤害",
    "受影响目标在自己的每个回合结束时进行一次不消耗法术位的 Wisdom save；失败再次承受 4d10 psychic damage，成功删除本次来源效果并终止法术",
    "每升一环增加 1d10 psychic damage（首次与回合末伤害同为 2024 的同一伤害式）",
    "施法建立最长一分钟的专注；专注结束时清理仍存在的目标效果，不同施法来源按 source-target identity 隔离",
  ], { status: "compiler-passed" }),
});

export default phantasmalKiller;
