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

// L4 移植批（非 SRD，spells24 无源文档）：G 桶 + 2014 recipe blinding-smite。
// 5R 锚点 三环.htm#Blinding_Smite。与 2014 差异：命中即目盲（去掉 2014 的初始体质豁免）、升环额外伤害 +1d8、成分仅 V。
const blindingSmite = cleanRoomSpell({
  id: "blinding-smite",
  contract: spellContract({
    ruleset: "2024",
    level: 3,
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
      "5R 的施法时机是近战武器或徒手打击命中之后；declared-rider 把附赠动作提前到命中之前声明，未命中不耗槽、不建立命中前或命中后的专注窗口",
      "命中后目盲依靠目标每回合结束的体质豁免或一分钟固定生命周期结束，期间不建立专注",
      "徒手打击按 external:triggering-weapon-attack 的 melee-weapon 归类参与判定；非 weapon item 的徒手或天生武器攻击需 DM 手工触发",
    ],
  },
  fragments: [
    graphFragment({
      id: "blinding-smite-rider",
      actions: [
        publicAction("declare", "致盲斩 Blinding Smite", {
          activationType: "bonus",
          delivery: "declared-rider",
        }),
      ],
      artifacts: [
        cleanRoomEffect("blinding-smite", {
          scope: "source-target",
          reapply: "replace",
          name: "Blinding Smite",
          modifiers: [grantStatus("blinded")],
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
                dice(3, 8),
                dice(1, 8),
              ),
              damageTypes: ["radiant"],
            }),
            operation("apply-artifact", {
              id: "rider:apply-blinded",
              artifactId: "blinding-smite",
              target: "target:hit",
            }),
          ],
        }),
        rule({
          id: "repeat-save-at-turn-end",
          on: trigger("turn-end", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "blinding-smite",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:blinded")],
          do: [
            operation("saving-throw", {
              id: "repeat-save",
              ability: ["con"],
              target: "target:blinded",
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
              id: "remove-after-repeat-save",
              artifactId: "blinding-smite",
              target: "target:released",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "declared rider 只在下一次真实近战武器命中时消耗一个三环法术位；未命中保持资源和目标状态不变",
    "命中向父武器伤害注入一次 3d8 radiant，每比三环高一环再加 1d8，暴击扩骰交给 Midi",
    "5R 不再给目盲初始豁免：命中即应用来源绑定的 blinded 效果，不掷初始体质豁免",
    "受影响目标在自己的每个回合结束时免费重复 Constitution save，成功时只删除本次来源的 blinded 效果",
    "重复豁免不再次造成伤害或消耗法术位，效果到期或被替换时不会遗留 blinded 状态",
  ], { status: "compiler-passed" }),
});

export default blindingSmite;
