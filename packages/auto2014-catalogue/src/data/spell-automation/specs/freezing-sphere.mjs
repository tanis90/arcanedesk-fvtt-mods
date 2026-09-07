import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  consumesSourceArtifact,
  dice,
  duration,
  graphFragment,
  instant,
  operation,
  perSlotAboveBase,
  placedTemplate,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
} from "../dsl.mjs";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const freezingSphereDamage = perSlotAboveBase(
  dice(10, 6),
  dice(1, 6),
);

const freezingSphere = cleanRoomSpell({
  id: "freezing-sphere",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(instant()),
    primaryActionId: "immediate",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "Prepare Sphere 只在原施法者上建立 prepared-sphere source marker，不生成可转移的 Item、Token 或地面实体；把法球交给其他 creature、放置后的持有位置与由他人投掷均由 DM 跟踪和结算",
      "投石索发射、投石索射程与命中位置由 DM 处理；自动 Launch 只表示原施法者在 40 ft 内投掷法球，不推断武器、持有者或弹道",
      "prepared-sphere 在一分钟到期时只清理来源并关闭 Launch，不自动爆炸；若法球尚未被投掷，DM 在到期点手动结算原位置的爆炸与后果",
      "法球击中水体时，6-inch 深、30-ft-square 且持续 1 分钟的冻结区域不自动创建；水面游泳生物的受困，以及用 action 进行对抗本法术 DC 的 Strength check 脱困，均由 DM 结算",
    ],
  },
  fragments: [
    graphFragment({
      id: "freezing-sphere-graph",
      actions: [
        publicAction(
          "immediate",
          "欧提路克冰封法球：立即引爆 Freezing Sphere: Immediate Detonation",
        ),
        publicAction(
          "prepare",
          "欧提路克冰封法球：准备法球 Freezing Sphere: Prepare Sphere",
        ),
        publicAction(
          "launch",
          "欧提路克冰封法球：投掷 Freezing Sphere: Launch",
          {
            availableWhen: [consumesSourceArtifact("prepared-sphere")],
          },
        ),
      ],
      artifacts: [
        cleanRoomEffect("prepared-sphere", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Freezing Sphere: Prepared Sphere",
          markerOnly: true,
          modifiers: [],
          lifecycle: duration(1, "minutes"),
        }),
      ],
      rules: [
        rule({
          id: "immediate-freezing-sphere",
          on: trigger("action-used", { actionId: "immediate" }),
          targets: [
            placedTemplate("target:immediate", {
              type: "sphere",
              size: 60,
              range: 300,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume("immediate:consume"),
            operation("saving-throw", {
              id: "immediate:save",
              ability: ["con"],
              target: "target:immediate",
              onSave: "half",
            }),
            operation("damage", {
              id: "immediate:damage",
              target: "target:immediate",
              formula: freezingSphereDamage,
              damageTypes: ["cold"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "prepare-freezing-sphere",
          on: trigger("action-used", { actionId: "prepare" }),
          targets: [self("target:prepare")],
          do: [
            consume("prepare:consume"),
            operation("apply-artifact", {
              id: "prepare:apply-prepared-sphere",
              artifactId: "prepared-sphere",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "launch-freezing-sphere",
          on: trigger("action-used", { actionId: "launch" }),
          targets: [
            placedTemplate("target:launch", {
              type: "sphere",
              size: 60,
              range: 40,
              evaluation: "snapshot",
            }),
          ],
          do: [
            operation("saving-throw", {
              id: "launch:save",
              ability: ["con"],
              target: "target:launch",
              onSave: "half",
            }),
            operation("damage", {
              id: "launch:damage",
              target: "target:launch",
              formula: freezingSphereDamage,
              damageTypes: ["cold"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "consume-prepared-sphere-on-launch",
          on: trigger("action-used", { actionId: "launch" }),
          targets: [self("target:launch-source")],
          do: [
            operation("delete-artifact", {
              id: "launch:consume-prepared-sphere",
              artifactId: "prepared-sphere",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Immediate Detonation 是 300 ft placed-template public Action；60-ft-radius sphere 内 creature 进行 Constitution save，失败承受 10d6 cold damage、成功一半，每高于六环一环增加 1d6，且只消耗一个明确声明的六环或更高法术位",
    "Prepare Sphere 是 self public Action；只消耗一个明确声明的六环或更高法术位，并在原施法者建立保存原始 cast level、最长一分钟且不要求专注的 prepared-sphere source marker，不在准备时造成伤害",
    "Launch 是 40 ft placed-template public Action，仅在同一施法者存在 prepared-sphere 时可见和可用；它使用与 Immediate Detonation 相同的 60-ft-radius、Constitution save、半伤及原始施法环位伤害，且不再次消费法术位",
    "Launch 通过 consumesSourceArtifact 执行 source-bound one-shot：首个 world write 前取消仍可重试，committed 后消费 prepared-sphere 并拒绝第二次 Launch；partial 或 indeterminate 结果不自动 replay",
    "prepared-sphere 在一分钟到期时自动清理并关闭 Launch；交给他人、放置/持有位置、投石索发射、无人使用后的规则爆炸及水体冻结和脱困均保持明确 DM omission",
    "Immediate 与 Launch 都是瞬时模板快照，不留下持续区域；非模板目标、其他施法来源和无关 world state 保持不变",
  ], { status: "compiler-runtime-passed" }),
});

export default freezingSphere;
