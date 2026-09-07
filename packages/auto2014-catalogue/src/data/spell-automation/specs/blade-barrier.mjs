import {
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  eventTarget,
  graphFragment,
  operation,
  placedTemplate,
  predicate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "../dsl.mjs";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const bladeBarrierDamage = dice(6, 10);

const oncePerTurn = () => predicate("once-per-turn", {
  identity: "zoneInstanceId + targetUuid + turn",
});

const bladeBarrier = cleanRoomSpell({
  id: "blade-barrier",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(10, "minutes")),
    primaryActionId: "line",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "首波只实现固定 100-ft-long、5-ft-wide 的二维直线墙；较短直墙、最多 60 ft 直径的环墙及复杂形状由 DM 使用标准工具表示，系统不以填充圆形 zone 冒充环墙",
      "墙内 difficult terrain 与墙后 three-quarters cover 不由当前 membership marker 自动修改移动、攻击、视线或遮蔽，均由 DM 裁决",
      "20 ft 高度、不同 elevation、墙体边界和精确三维成员关系由 DM 调整；模板不创建 Foundry WallDocument、碰撞或视线系统",
      "进入伤害只响应 outside-to-inside 的区域成员变化，不扫描 Token 的完整移动路径；DM 必须把穿墙移动拆到墙格内完成结算",
    ],
  },
  fragments: [
    graphFragment({
      id: "blade-barrier-zone-graph",
      actions: [
        publicAction("line", "剑刃护壁：直墙 Blade Barrier: Line"),
      ],
      artifacts: [
        artifact({
          id: "blade-barrier-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: {
              type: "line",
              size: 100,
              width: 5,
              units: "ft",
            },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("blade-barrier-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Blade Barrier Area",
          markerOnly: true,
          lifecycle: whileArtifact("blade-barrier-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-blade-barrier-line",
          on: trigger("action-used", { actionId: "line" }),
          targets: [
            placedTemplate("target:line", {
              type: "line",
              size: 100,
              width: 5,
              range: 90,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "line:create-zone",
              artifactId: "blade-barrier-zone",
              target: "target:line",
            }),
          ],
        }),
        rule({
          id: "blade-barrier-entry",
          on: trigger("enter", { zoneId: "blade-barrier-zone" }),
          when: [oncePerTurn()],
          targets: [eventTarget("target:entry")],
          do: [
            operation("saving-throw", {
              id: "entry-save",
              ability: ["dex"],
              target: "target:entry",
              onSave: "half",
            }),
            operation("damage", {
              id: "entry-damage",
              target: "target:entry",
              formula: bladeBarrierDamage,
              damageTypes: ["slashing"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "blade-barrier-turn-start",
          on: trigger("turn-start", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "blade-barrier-membership",
              subject: "effect-target",
            }),
            oncePerTurn(),
          ],
          targets: [eventTarget("target:turn-start")],
          do: [
            operation("saving-throw", {
              id: "turn-start-save",
              ability: ["dex"],
              target: "target:turn-start",
              onSave: "half",
            }),
            operation("damage", {
              id: "turn-start-damage",
              target: "target:turn-start",
              formula: bladeBarrierDamage,
              damageTypes: ["slashing"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Line 是 placed-template public Activity；DM 在施法者 90 ft 内放置并定向一条固定 100-ft-long、5-ft-wide 的二维直墙，一次调用只消费一个六环或更高法术位并建立最长 10 分钟专注",
    "区域创建时只建立固定模板和 membership，不进行豁免或伤害；模板内初始成员直到满足 entry 或自己的 turn-start 才结算",
    "creature 每回合首次主动进入墙格或在墙格内开始自己的回合时，使用同一来源 DC 进行 Dexterity save；失败承受 6d10 slashing damage，成功承受一半",
    "entry 与 turn-start 共享 zoneInstanceId + targetUuid + turn receipt；同一区域、目标和回合至多结算一次，重复 membership 或事件不重复伤害",
    "模板在本次施法内保持 fixed placed-point；施法后手工移动模板不属于受支持流程，membership 只随 creature Token 的真实移动更新且不得伪造 entry，区域外非目标保持不变",
    "解除、替换或到期结束专注时按 cast identity 删除模板、membership 与 phase receipt；不同施法来源相互隔离",
    "Ring、较短或复杂墙形、difficult terrain、three-quarters cover、视线、20 ft 高度与精确三维成员关系保持明确 DM omission",
  ], { status: "compiler-runtime-passed" }),
});

export default bladeBarrier;
