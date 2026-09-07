import {
  QA_LOG,
  acceptance,
  allAttackRolls,
  blockActionKinds,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  duration,
  eventTarget,
  gainAttackDisadvantage,
  grantAbilityCheckDisadvantage,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  untilTrigger,
} from "../dsl.mjs";

const staggeringSmite = cleanRoomSpell({
  id: "staggering-smite",
  contract: spellContract({
    ruleset: "2014",
    level: 4,
    school: "evo",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
    primaryActionId: "declare",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "bonus-action 预施法专注窗口不单独建模；declared-rider 在首次真实近战武器命中时才消耗法术位，未命中不耗槽",
    ],
  },
  fragments: [
    graphFragment({
      id: "staggering-smite-rider",
      actions: [
        publicAction("declare", "惊惧斩 Staggering Smite", {
          activationType: "bonus",
          delivery: "declared-rider",
        }),
      ],
      artifacts: [
        cleanRoomEffect("staggering-smite", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Staggering Smite",
          modifiers: [
            gainAttackDisadvantage(allAttackRolls()),
            grantAbilityCheckDisadvantage([
              "str",
              "dex",
              "con",
              "int",
              "wis",
              "cha",
            ]),
            blockActionKinds(["reaction"]),
          ],
          lifecycle: untilTrigger(
            trigger("turn-end", {
              subject: "effect-target",
              occurrence: "next-after-created",
            }),
          ),
        }),
      ],
      rules: [
        rule({
          id: "resolve-declared-rider",
          on: trigger("operation-outcome", {
            operationId: "external:triggering-weapon-attack",
            outcome: "hit",
          }),
          when: [
            predicate("declared"),
            predicate("attack-kind", { value: "melee-weapon" }),
          ],
          targets: [eventTarget("target:hit")],
          do: [
            consume("rider:consume", "on-hit"),
            operation("damage", {
              id: "rider:damage",
              target: "target:hit",
              formula: dice(4, 6),
              damageTypes: ["psychic"],
            }),
            operation("saving-throw", {
              id: "rider:save",
              ability: ["wis"],
              target: "target:hit",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "rider-save-failed",
          on: trigger("operation-outcome", {
            operationId: "rider:save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "rider:apply-staggering-smite",
              artifactId: "staggering-smite",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "declared rider 只在首次真实近战武器命中时消耗一个四环或更高法术位；未命中保持法术位与目标状态不变，也不建立独立的预施法专注 marker",
    "命中向父武器伤害注入一次 4d6 psychic，暴击扩骰交给 Midi，随后只进行一次 Wisdom save",
    "Wisdom save 成功时不应用额外效果；失败时目标的所有 attack rolls 与全部六项 ability checks 具有劣势，并且不能采取 reaction",
    "失败效果精确持续到目标的下一回合结束；若在目标自己回合内由反应攻击命中，本回合结束不提前清理，直到其后续回合结束才移除",
    "同一来源重施只替换自己的 source-target 效果，不同来源彼此隔离；清理后攻击、检定与 reaction 能力恢复，非目标始终不变",
  ], { status: "compiler-runtime-passed" }),
});

export default staggeringSmite;
