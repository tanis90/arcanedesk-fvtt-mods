import {
  acceptance,
  adjustWeaponHitDamage,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  dice,
  duration,
  eventTarget,
  grantAbilityCheckAdvantage,
  grantAbilityCheckDisadvantage,
  grantAbilitySavingThrowAdvantage,
  grantAbilitySavingThrowDisadvantage,
  graphFragment,
  operation,
  parentPrimaryDamageType,
  predicate,
  publicAction,
  requiredEnumSelection,
  rule,
  selected,
  spellContract,
  transformPhysicalSize,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const enlargereduce = cleanRoomSpell({
  id: "enlargereduce",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "当前 CLI 没有合法的 object target wire contract，因此只接受 creature target；未被穿戴或携带的可见物体暂由 DM 手工处理",
      "穿戴或携带物品随目标改变尺寸、物品掉落时立刻恢复，以及这些物品的尺寸和重量记录暂由 DM 维护",
      "Enlarge 在空间不足时只增长到可容纳的最大尺寸依赖场景三维空间与碰撞数据，当前由 DM 限制最终体型和 token footprint",
      "visible-to-source 目前只进入 interaction projection，不由通用 runtime 独立校验视线；DM 负责只声明施法者可见的目标",
      "dimensionScale 与 weightScale 目前作为 compiler metadata 保留，Foundry Actor 没有可供通用 runtime 修改的生物身高和体重机械字段",
      "不同施法来源同时对同一目标施加 Enlarge/Reduce 的互斥与优先级尚未自动裁决，由 DM 避免并行冲突",
    ],
  },
  fragments: [
    graphFragment({
      id: "enlargereduce-graph",
      actions: [
        publicAction("cast", "变巨/缩小术 Enlarge/Reduce", {
          parameters: [
            requiredEnumSelection(
              "effectMode",
              ["enlarge", "reduce"],
              {
                labels: {
                  enlarge: "变巨 Enlarge",
                  reduce: "缩小 Reduce",
                },
              },
            ),
            requiredEnumSelection(
              "targetWillingness",
              ["willing", "unwilling"],
              {
                labels: {
                  willing: "自愿目标 Willing",
                  unwilling: "非自愿目标 Unwilling",
                },
              },
            ),
          ],
        }),
      ],
      artifacts: [
        cleanRoomEffect("enlarged", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Enlarge",
          modifiers: [
            transformPhysicalSize({
              sizeCategorySteps: 1,
              dimensionScale: constant(2),
              weightScale: constant(8),
              tokenFootprint: "from-resulting-size-category",
            }),
            grantAbilityCheckAdvantage(["str"]),
            grantAbilitySavingThrowAdvantage(["str"]),
            adjustWeaponHitDamage({
              direction: "add",
              value: dice(1, 4),
              damageType: parentPrimaryDamageType(),
            }),
          ],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("reduced", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Reduce",
          modifiers: [
            transformPhysicalSize({
              sizeCategorySteps: -1,
              dimensionScale: constant(0.5),
              weightScale: constant(0.125),
              tokenFootprint: "from-resulting-size-category",
            }),
            grantAbilityCheckDisadvantage(["str"]),
            grantAbilitySavingThrowDisadvantage(["str"]),
            adjustWeaponHitDamage({
              direction: "subtract",
              value: dice(1, 4),
              damageType: parentPrimaryDamageType(),
              minimumTotal: constant(1),
            }),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-enlargereduce",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 30,
              units: "ft",
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["con"],
              target: "target:cast",
              onSave: "none",
              rollMode: "unwilling-creature-only",
            }),
          ],
        }),
        rule({
          id: "initial-save-failed-enlarge",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          when: [
            predicate("input-selection-equals", {
              id: "effectMode",
              value: "enlarge",
            }),
          ],
          targets: [eventTarget("target:enlarge")],
          do: [
            operation("apply-artifact", {
              id: "apply-enlarge",
              artifactId: "enlarged",
              target: "target:enlarge",
            }),
          ],
        }),
        rule({
          id: "initial-save-failed-reduce",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          when: [
            predicate("input-selection-equals", {
              id: "effectMode",
              value: "reduce",
            }),
          ],
          targets: [eventTarget("target:reduce")],
          do: [
            operation("apply-artifact", {
              id: "apply-reduce",
              artifactId: "reduced",
              target: "target:reduce",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "只暴露一个 30-ft public cast action，并要求调用者明确提供 effectMode 与 targetWillingness；缺失或非法 selection 以及目标数错误均在扣槽与 workflow 前拒绝；可见性是投影元数据并由 DM 声明确认",
    "targetWillingness=willing 时不掷豁免并进入所选模式；unwilling 时进行 Constitution save，成功者不改变，失败者才获得所选效果；一次施法只消耗一个二环或更高法术位",
    "Enlarge 将体型相对增加一级并按结果体型更新 token footprint；尺寸乘 2 与重量乘 8 保留为 compiler metadata；Strength checks 与 saving throws 获得优势，武器命中额外造成与主伤害同类型的 1d4",
    "Reduce 将体型相对降低一级并按结果体型更新 token footprint；尺寸乘 1/2 与重量乘 1/8 保留为 compiler metadata；Strength checks 与 saving throws 具有劣势，武器命中同类型伤害减少 1d4 且总伤害不低于 1",
    "两种模式都不修改 Strength score、attack bonus、Armor Class、hit points、reach 或 movement speed；同一次施法和同一来源不会同时把两个模式应用到同一目标",
    "解除、替换或到期结束专注时精确恢复体型、token footprint、检定/豁免和武器伤害；同一来源重施时 replace 而不累积倍率",
    "object target、穿戴/携带物品和空间不足边界严格保持在 support omissions，不会伪装为已由 creature-only runtime 自动结算",
  ], { status: "compiler-runtime-passed" }),
});

export default enlargereduce;
