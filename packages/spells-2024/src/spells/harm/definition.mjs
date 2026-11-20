import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  eventTarget,
  graphFragment,
  instant,
  manual,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 A/B 桶 desc-diff-flag）：2024 的生命值上限减损没有 1 小时时限，
// 也不能以移除疾病恢复（高等复原术的「生命值上限降低」项才是移除途径）；14d6 暗蚀半伤不变。
// 5R 锚点：玩家手册2024/法术详述/6环.htm#Harm。
const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";
const CAPACITY_REDUCTION_ARTIFACT = "harm-hit-point-capacity-reduction";

const harm = cleanRoomSpell({
  id: "harm",
  contract: spellContract({
    ruleset: "2024",
    level: 6,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "生命值上限减损的实际数值由 DM 按该次结算的暗蚀伤害写入（typed-damage 事务脚本强制 durationSeconds，无法表达 2024 的「无时限」）",
      "2024 没有 1 小时时限，移除疾病不再恢复上限；高等复原术移除「生命值上限降低」时由 DM 删除本次来源的 marker",
      "减损后的上限不得低于 1 由 DM 在写入时保证",
    ],
  },
  fragments: [
    graphFragment({
      id: "harm-graph",
      actions: [
        publicAction("cast", "重伤术 Harm"),
      ],
      artifacts: [
        cleanRoomEffect(CAPACITY_REDUCTION_ARTIFACT, {
          host: "actor",
          scope: "cast-target",
          identityKeys: ["castUuid", "targetUuid"],
          reapply: "stack",
          name: "Harm — Maximum Hit Points Reduced",
          markerOnly: true,
          lifecycle: manual(),
        }),
      ],
      rules: [
        rule({
          id: "cast-harm",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 60,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "harm-save",
              ability: ["con"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "cast:harm-damage",
              target: "target:cast",
              formula: dice(14, 6),
              damageTypes: ["necrotic"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "harm-save-failed",
          on: trigger("operation-outcome", {
            operationId: "harm-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "failed:apply-capacity-reduction",
              artifactId: CAPACITY_REDUCTION_ARTIFACT,
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Cast 是 selected-targets public Activity，只接受施法者 60 ft 内一个可见 creature，并只消耗一个六环或更高法术位",
    "目标进行 Constitution save；失败时按 14d6 necrotic damage 结算，成功时结算一半伤害且不建立上限减损 marker",
    "失败分支在目标上建立独立 cast-target 来源的 maximum-HP reduction marker，并按 2024 口径不设到期时间",
    "减损数值等于目标实际承受的暗蚀伤害，上限不得低于 1；具体写入由 DM 按 marker 提示执行",
    "2024 没有 1 小时自动恢复，移除疾病（Lesser Restoration / 旧版 Remove Disease 语义）不会恢复上限；高等复原术移除该减损时由 DM 删除本来源 marker，其他来源实例不变",
    "该瞬时法术不建立专注、持续 Template 或其他残留 Artifact；非目标保持不变",
  ], { status: "compiler-passed" }),
});

export default harm;
