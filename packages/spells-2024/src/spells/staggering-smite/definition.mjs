import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  eventTarget,
  grantStatus,
  graphFragment,
  instant,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  untilTrigger,
} from "@arcanedesk/spell-compiler/dsl";

// L4 移植批（G 桶，非 SRD，spells24 无源文档）：2014 recipe 搬运改契约。
// 5R 锚点 Staggering_Smite（4环.htm）：头部 四环 惑控（圣武士），V，附赠动作紧接近战命中。
// 与 2014 差异：学派 塑能→惑控；失败效果由「攻击/检定劣势+禁反应」改为震慑至你下回合结束，并补每环 +1d6。
const staggeringSmite = cleanRoomSpell({
  id: "staggering-smite",
  contract: spellContract({
    ruleset: "2024",
    level: 4,
    school: "enc",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(instant()),
    primaryActionId: "declare",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "bonus-action 预施法专注窗口不单独建模；declared-rider 在首次真实近战武器命中时才消耗法术位，未命中不耗槽",
      "震慑的结束边界以施法者下一次回合结束脉冲为界；跨场景或回合顺序被手动篡改时的边界由 DM 裁定",
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
          modifiers: [grantStatus("stunned")],
          lifecycle: untilTrigger(
            trigger("turn-end", { subject: "source" }),
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
              formula: perSlotAboveBase(
                dice(4, 6),
                dice(1, 6),
              ),
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
    "命中向父武器伤害注入一次 4d6 psychic，每高一环增加 1d6；暴击扩骰交给 Midi",
    "随后只进行一次 Wisdom save；成功时不应用额外效果",
    "失败时目标陷入 stunned，效果精确持续到施法者下一次回合结束",
    "同一来源重施只替换自己的 source-target 效果，清理后震慑状态恢复，非目标始终不变",
  ], { status: "compiler-passed" }),
});

export default staggeringSmite;
