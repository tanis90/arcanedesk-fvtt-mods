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
  perSlotAboveBase,
  placedTemplate,
  predicate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const thornDamage = perSlotAboveBase(
  dice(7, 8),
  dice(1, 8),
);

const oncePerTurnPhase = () => predicate("once-per-turn", {
  identity: "zoneInstanceId + targetUuid + turn + phase",
});

const membershipGuard = () => predicate("artifact-exists", {
  artifactId: "wall-of-thorns-membership",
  subject: "effect-target",
});

const thornPulse = ({ id, on, targetId, includeMembershipGuard = false }) =>
  rule({
    id,
    on,
    when: [
      ...(includeMembershipGuard ? [membershipGuard()] : []),
      oncePerTurnPhase(),
    ],
    targets: [eventTarget(targetId)],
    do: [
      operation("saving-throw", {
        id: `${id}:save`,
        ability: ["dex"],
        target: targetId,
        onSave: "half",
      }),
      operation("damage", {
        id: `${id}:damage`,
        target: targetId,
        formula: thornDamage,
        damageTypes: ["slashing"],
        onSave: "half",
      }),
    ],
  });

const wallOfThorns = cleanRoomSpell({
  id: "wall-of-thorns",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(10, "minutes")),
    primaryActionId: "line",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "首波只实现固定 60-ft-long、5-ft-wide 的二维直墙；较短直墙、20-ft-diameter、5-ft-thick 且最高 20 ft 的 Ring 与其他复杂形状由 DM 使用标准工具表示",
      "直墙 10 ft 高度、不同 elevation、边界与精确三维成员关系由 DM 裁决；二维模板不创建 Foundry WallDocument 或碰撞体",
      "墙阻挡 line of sight 的规则由 DM 在后续攻击与施法前裁决；membership marker 不自动改变视觉、遮蔽或目标合法性",
      "穿墙每移动 1 ft 消耗 4 ft movement 由 DM 跟踪；Runtime 不修改速度或扫描完整移动路径，DM 必须把穿墙移动拆到墙格内以触发 outside-to-inside entry",
      "模板被手工移动时只刷新 membership，不视为 creature 主动进入，也不触发 entry 伤害；墙体应保持施法时的固定位置与几何",
    ],
  },
  fragments: [
    graphFragment({
      id: "wall-of-thorns-zone-graph",
      actions: [
        publicAction("line", "棘墙术：直墙 Wall of Thorns: Line"),
      ],
      artifacts: [
        artifact({
          id: "wall-of-thorns-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: {
              type: "line",
              size: 60,
              width: 5,
              units: "ft",
            },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("wall-of-thorns-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Wall of Thorns Area",
          markerOnly: true,
          lifecycle: whileArtifact("wall-of-thorns-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-wall-of-thorns-line",
          on: trigger("action-used", { actionId: "line" }),
          targets: [
            placedTemplate("target:line", {
              type: "line",
              size: 60,
              width: 5,
              range: 120,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "line:create-zone",
              artifactId: "wall-of-thorns-zone",
              target: "target:line",
            }),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["dex"],
              target: "target:line",
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-damage",
              target: "target:line",
              formula: thornDamage,
              damageTypes: ["piercing"],
              onSave: "half",
            }),
          ],
        }),
        thornPulse({
          id: "wall-of-thorns-entry",
          on: trigger("enter", { zoneId: "wall-of-thorns-zone" }),
          targetId: "target:entry",
        }),
        thornPulse({
          id: "wall-of-thorns-turn-end",
          on: trigger("turn-end", { subject: "zone-member" }),
          targetId: "target:turn-end",
          includeMembershipGuard: true,
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Line 是 placed-template public Activity；DM 在施法者 120 ft 内放置并定向一条固定 60-ft-long、5-ft-wide 的二维直墙，一次调用只消费一个六环或更高法术位并建立最长 10 分钟专注",
    "墙出现时，模板快照内每个 creature 进行 Dexterity save；失败承受 7d8 piercing damage，成功承受一半，区域外非目标保持不变",
    "creature 每回合首次进入墙格时使用同一来源 DC 进行 Dexterity save；失败承受 7d8 slashing damage，成功承受一半，同回合重复 entry 不重复结算",
    "墙格成员在自己的回合结束时使用同一来源 DC 进行 Dexterity save；失败承受 7d8 slashing damage，成功承受一半；turn-start 本身不造成伤害",
    "entry 与 turn-end 使用 zoneInstanceId + targetUuid + turn + phase 分相 receipt；同一区域、目标、回合的每个相位至多结算一次，合法 entry 与 turn-end 可以各结算一次",
    "每高于六环一环，initial piercing、entry slashing 与 turn-end slashing 各增加 1d8；七环时三者各为 8d8，并继承首次施法的实际环位",
    "模板在本次施法内保持 fixed placed-point；施法后手工移动模板不属于受支持流程，membership 只随 creature Token 的真实移动更新且不得伪造 entry 伤害；结束、替换或到期结束专注时按 cast identity 清理模板、membership 与 receipt，不影响其他施法来源",
    "Ring、line of sight、穿墙 4:1 movement、直墙高度、三维成员、复杂形状与 WallDocument 保持明确 DM omission",
  ], { status: "compiler-runtime-passed" }),
});

export default wallOfThorns;
