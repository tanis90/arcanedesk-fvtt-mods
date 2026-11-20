import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L4 移植批（G 桶，非 SRD，spells24 无源文档）：2014 recipe 搬运改契约。
// 5R 锚点 Wrathful_Smite（1环.htm）：头部 一环 死灵（圣武士），V，附赠动作紧接近战命中，持续1分钟。
// 与 2014 差异：学派 塑能→死灵、伤害 心灵→暗蚀；恐慌改为目标每回合结束重复感知豁免（2014 为动作属性检定），并补每环 +1d6。
const wrathfulSmite = cleanRoomSpell({
  id: "wrathful-smite",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "nec",
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
      "目标必须能看见或听见触发源才受恐慌影响的资格判定由 DM 处理；DSL 不校验惊恐来源可见性",
      "frightened 的移动限制由状态本身承担，主动远离与无法靠近的路径校验不额外建模",
      "declared-rider 将 bonus-action 施法声明合并到命中事件；未命中不耗槽，也不建立命中前或命中后的专注窗口",
    ],
  },
  fragments: [
    graphFragment({
      id: "wrathful-smite-rider",
      actions: [
        publicAction("declare", "激愤斩 Wrathful Smite", {
          activationType: "bonus",
          delivery: "declared-rider",
        }),
      ],
      artifacts: [
        cleanRoomEffect("wrathful-fear", {
          scope: "source-target",
          reapply: "replace",
          name: "Wrathful Smite",
          modifiers: [grantStatus("frightened")],
          lifecycle: whileSpellActive(),
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
                dice(1, 6),
                dice(1, 6),
              ),
              damageTypes: ["necrotic"],
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
              id: "rider:apply-frightened",
              artifactId: "wrathful-fear",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "repeat-save-at-turn-end",
          on: trigger("turn-end", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "wrathful-fear",
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
          id: "repeat-save-succeeded",
          on: trigger("operation-outcome", {
            operationId: "repeat-save",
            outcome: "success",
          }),
          targets: [eventTarget("target:released")],
          do: [
            operation("delete-artifact", {
              id: "remove-frightened",
              artifactId: "wrathful-fear",
              target: "target:released",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "声明 rider 后只在真实近战武器命中时消耗一个一环或更高法术位",
    "命中只追加一次 1d6 necrotic，每高一环增加 1d6",
    "随后只进行一次 Wisdom save，失败时应用一个包含 frightened 的 Wrathful Smite 效果",
    "受害目标在自己每个回合结束时进行不消耗法术位的 Wisdom save，成功后移除该效果",
    "法术持续 1 分钟且不建立专注；一次合法施法只消耗一个明确声明环位的法术位",
    "豁免 activity 不造成伤害，也不再次消耗法术位；未命中不消耗法术位",
  ], { status: "compiler-passed" }),
});

export default wrathfulSmite;
