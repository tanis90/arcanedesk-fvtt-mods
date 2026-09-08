import {
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
  predicate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const blindingSmite = cleanRoomSpell({
  id: "blinding-smite",
  contract: spellContract({
    ruleset: "2014",
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
      "declared-rider 将 bonus-action 施法声明合并到下一次近战武器命中；未命中不耗槽，也不建立命中前或命中后的专注窗口；命中后的 blinded 依靠重复豁免或一分钟固定生命周期结束",
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
              formula: dice(3, 8),
              damageTypes: ["radiant"],
            }),
            operation("saving-throw", {
              id: "rider:save",
              ability: ["con"],
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
              id: "rider:apply-blinded",
              artifactId: "blinding-smite",
              target: "target:failed",
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
  accepted: acceptance(EXPANSION_BATCH, [
    "declared rider 只在下一次真实近战武器命中时消耗一个三环法术位；未命中保持资源和目标状态不变",
    "命中向父武器伤害注入一次 3d8 radiant，暴击扩骰交给 Midi，随后只进行一次 Constitution save",
    "初始豁免失败时应用一个来源绑定的 blinded 效果，成功时不应用效果",
    "受影响目标在自己的每个回合结束时免费重复 Constitution save，成功时只删除本次来源的 blinded 效果",
    "重复豁免不再次造成伤害或消耗法术位，效果到期或被替换时不会遗留 blinded 状态",
  ], { status: "compiler-runtime-passed" }),
});

export default blindingSmite;
