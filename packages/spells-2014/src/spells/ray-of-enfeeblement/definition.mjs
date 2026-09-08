import {
  compilerAcceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  duration,
  endSourceWhenLastDependentEnds,
  eventTarget,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  scaleWeaponHitDamage,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const rayOfEnfeeblement = cleanRoomSpell({
  id: "ray-of-enfeeblement",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "规则允许目标选择是否在自己的回合结束时尝试 Constitution save；当前对受此负面效果影响的目标默认每回合自动尝试，若目标主动放弃该次豁免则由 DM 忽略结果并维持效果",
    ],
  },
  fragments: [
    graphFragment({
      id: "ray-of-enfeeblement-graph",
      actions: [
        publicAction("cast", "衰弱射线 Ray of Enfeeblement"),
      ],
      artifacts: [
        cleanRoomEffect("ray-of-enfeeblement", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Ray of Enfeeblement",
          modifiers: [
            scaleWeaponHitDamage({
              abilities: ["str"],
              multiplier: constant(0.5),
            }),
          ],
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-ray-of-enfeeblement",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 60,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("attack-roll", {
              id: "cast:attack",
              target: "target:cast",
              attack: {
                source: "spellcasting",
                range: "ranged",
              },
            }),
          ],
        }),
        rule({
          id: "apply-enfeeblement-on-hit",
          on: trigger("operation-outcome", {
            operationId: "cast:attack",
            outcome: "hit",
          }),
          targets: [eventTarget("target:hit")],
          do: [
            operation("apply-artifact", {
              id: "hit:apply-enfeeblement",
              artifactId: "ray-of-enfeeblement",
              target: "target:hit",
            }),
          ],
        }),
        rule({
          id: "repeat-save-at-turn-end",
          on: trigger("turn-end", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "ray-of-enfeeblement",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:enfeebled")],
          do: [
            operation("saving-throw", {
              id: "repeat-save",
              ability: ["con"],
              target: "target:enfeebled",
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
              id: "success:remove-enfeeblement",
              artifactId: "ray-of-enfeeblement",
              target: "target:released",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: compilerAcceptance(EXPANSION_BATCH, [
    "60 ft 内一个声明目标进行 ranged spell attack，并只消耗一个二环或更高环位的法术位；未命中不创建目标效果",
    "命中目标获得来源绑定的 Ray of Enfeeblement effect，并建立最长一分钟的专注；施法本身不造成伤害",
    "受影响目标以 Strength 进行的 weapon attack 命中后，其完整武器攻击伤害在暴击及其他伤害构成确定后减半并向下取整",
    "Dexterity 武器攻击、spell attack、save damage 与非武器伤害不受衰弱射线影响",
    "目标在自己的每个回合结束时默认免费进行 Constitution save；失败保留效果，成功删除本次来源的目标效果并结束对应专注",
    "解除、替换或一分钟到期结束专注时精确清理目标效果；不同施法来源按 source-target identity 隔离",
  ]),
});

export default rayOfEnfeeblement;
