import {
  QA_LOG,
  acceptance,
  adjustWeaponHitDamage,
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
  grantAbilitySavingThrowDisadvantage,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：由远程法术攻击改为体质豁免；
// 失败者对力量 D20 检定劣势且所有伤害掷骰 -1d8（不再是攻击伤害减半）。
// 5R 锚点：5R 玩家手册2024 2环.htm#Ray_of_Enfeeblement。
const rayOfEnfeeblement = cleanRoomSpell({
  id: "ray-of-enfeeblement",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "nec",
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
      "5R 的「使用力量属性的 D20 检定劣势」包含力量攻击检定；modifier 只支持全攻击或属性检定/豁免两种选择，力量攻击检定这一项未自动化，由 DM 处理",
      "5R 的「所有伤害掷骰 -1d8」以 system.bonuses.weapon.damage 实现，只覆盖武器伤害；法术伤害与其他非武器伤害的 -1d8 由 DM 处理",
      "豁免成功时 5R 只令其「下一次攻击检定」具有劣势；当前以到施法者下回合开始为止的全攻击检定劣势近似，窗口内多次攻击都会被判定为劣势",
    ],
  },
  fragments: [
    graphFragment({
      id: "ray-of-enfeeblement-graph",
      actions: [publicAction("cast", "衰弱射线 Ray of Enfeeblement")],
      artifacts: [
        cleanRoomEffect("ray-of-enfeeblement", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Ray of Enfeeblement",
          modifiers: [
            grantAbilityCheckDisadvantage(["str"]),
            grantAbilitySavingThrowDisadvantage(["str"]),
            adjustWeaponHitDamage({
              direction: "subtract",
              value: dice(1, 8),
              damageType: "parent-primary",
            }),
          ],
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("ray-of-enfeeblement-brace", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Ray of Enfeeblement: Weakened Guard",
          modifiers: [
            gainAttackDisadvantage(allAttackRolls()),
          ],
          lifecycle: untilTrigger(
            trigger("turn-start", { subject: "source" }),
          ),
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
            operation("saving-throw", {
              id: "cast:save",
              ability: ["con"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "apply-enfeeblement-on-failed-save",
          on: trigger("operation-outcome", {
            operationId: "cast:save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "failure:apply-enfeeblement",
              artifactId: "ray-of-enfeeblement",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "apply-brace-on-successful-save",
          on: trigger("operation-outcome", {
            operationId: "cast:save",
            outcome: "success",
          }),
          targets: [eventTarget("target:succeeded")],
          do: [
            operation("apply-artifact", {
              id: "success:apply-brace",
              artifactId: "ray-of-enfeeblement-brace",
              target: "target:succeeded",
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
  accepted: acceptance(QA_LOG, [
    "action 对 60 ft 内一个 creature 发起 Constitution save，只消耗一个二环或更高法术位；施法本身不造成伤害",
    "豁免失败的目标获得来源绑定的衰弱效果：力量属性检定与力量豁免具有劣势，武器伤害掷骰 -1d8",
    "豁免成功的目标获得一个到施法者下回合开始为止的攻击检定劣势效果（5R 只限定下一次攻击，见 omission）",
    "受影响目标在自己的每个回合结束时进行一次不消耗法术位的 Constitution save；失败保留效果，成功删除本次来源效果并结束对应专注",
    "每升一环不改变效果；解除、替换或一分钟到期结束专注时精确清理目标效果",
  ], { status: "compiler-passed" }),
});

export default rayOfEnfeeblement;
