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
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（2024，M1 审计 C 桶 recipe-invalid）：伤害类型由挥砍改为力场；
// 6d10、敏捷豁免半伤、专注 10 分钟与升环无关的契约不变，结算时机按 2024 明确为
// 「进入墙格或在该处结束回合」。
// 来源：5R 玩家手册2024 6环.htm#Blade_Barrier。
const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const bladeBarrierDamage = dice(6, 10);

const oncePerTurn = () => predicate("once-per-turn", {
  identity: "zoneInstanceId + targetUuid + turn",
});

const membershipGuard = () => predicate("artifact-exists", {
  artifactId: "blade-barrier-membership",
  subject: "effect-target",
});

const zonePulse = ({ id, on, includeMembershipGuard = false }) => rule({
  id,
  on,
  when: [
    ...(includeMembershipGuard ? [membershipGuard()] : []),
    oncePerTurn(),
  ],
  targets: [eventTarget("target:pulse")],
  do: [
    operation("saving-throw", {
      id: `${id}:save`,
      ability: ["dex"],
      target: "target:pulse",
      onSave: "half",
    }),
    operation("damage", {
      id: `${id}:damage`,
      target: "target:pulse",
      formula: bladeBarrierDamage,
      damageTypes: ["force"],
      onSave: "half",
    }),
  ],
});

const bladeBarrier = cleanRoomSpell({
  id: "blade-barrier",
  contract: spellContract({
    ruleset: "2024",
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
            operation("saving-throw", {
              id: "cast:save",
              ability: ["dex"],
              target: "target:line",
              onSave: "half",
            }),
            operation("damage", {
              id: "cast:damage",
              target: "target:line",
              formula: bladeBarrierDamage,
              damageTypes: ["force"],
              onSave: "half",
            }),
          ],
        }),
        zonePulse({
          id: "blade-barrier-entry",
          on: trigger("enter", { zoneId: "blade-barrier-zone" }),
        }),
        zonePulse({
          id: "blade-barrier-turn-end",
          on: trigger("turn-end", { subject: "zone-member" }),
          includeMembershipGuard: true,
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Line 是 placed-template public Activity；DM 在施法者 90 ft 内放置并定向一条固定 100-ft-long、5-ft-wide 的二维直墙，一次调用只消费一个六环或更高法术位并建立最长 10 分钟专注",
    "墙出现时处于墙格内的 creature 立即进行 Dexterity save；失败承受 6d10 force damage，成功承受一半",
    "creature 每回合首次主动进入墙格或在该墙格内结束自己的回合时，使用同一来源 DC 进行 Dexterity save；失败承受 6d10 force damage，成功承受一半",
    "cast、entry 与 turn-end 共享 zoneInstanceId + targetUuid + turn receipt；同一区域、目标和回合至多结算一次，重复 membership 或事件不重复伤害",
    "2024 伤害类型为 force，不再是 2014 的 slashing；模板在本次施法内保持 fixed placed-point，施法后手工移动模板不属于受支持流程",
    "解除、替换或到期结束专注时按 cast identity 删除模板与 membership；不同施法来源相互隔离",
    "Ring、较短或复杂墙形、difficult terrain、three-quarters cover、视线、20 ft 高度与精确三维成员关系保持明确 DM omission",
  ], { status: "compiler-passed" }),
});

export default bladeBarrier;
