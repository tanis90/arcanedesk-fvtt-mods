import {
  QA_LOG,
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  graphFragment,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/6环.htm#Move_Earth。
// 自动化等级：utility marker-only——120 ft 内 40 ft 地形区域 + 成员标记；地形重塑由 DM 执行。
const moveEarth = cleanRoomSpell({
  id: "move-earth",
  contract: spellContract({
    ruleset: "2024",
    level: 6,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(2, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "地形的缓慢重塑（10 分钟完成一次改造：升高/降低地面、沟渠、屏障、立柱，任一改造不超过区域最大边长一半）没有地形编辑原语，由 DM 在场景中手动处理",
      "每维持 10 分钟专注可以选择一片新的地形区域：当前只有一片 cast 绑定区域，额外区域由 DM 手动放置",
      "无法改变天然岩石或石制建筑、建筑可能因适应地形而失稳倒塌、被移走的泥土会带走其上植物：由 DM 裁定",
      "「区域内的生物通常不会被地面的移动困住或受伤」保持为规则文本：本实现不施加状态、伤害或移动修改",
      "40 ft 区域只有模板几何，垂直边界与不同 elevation 的成员关系由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "move-earth-graph",
      actions: [publicAction("cast", "地动术 Move Earth")],
      artifacts: [
        artifact({
          id: "move-earth-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "cube", size: 40, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("move-earth-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Move Earth Area",
          markerOnly: true,
          lifecycle: whileArtifact("move-earth-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-move-earth",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cube",
              size: 40,
              range: 120,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "move-earth-zone",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 在 120 ft 内放置一个 40-ft cube 的地形区域，只消耗一个六环或更高法术位并建立最长 2 小时专注",
    "区域为可见机械区域，进入与离开时动态登记或移除成员 marker；不施加状态、伤害或移动修改",
    "地形改造、每次改造 10 分钟、每 10 分钟更换区域与岩石/建筑限制由 DM 按 5R 原文执行",
    "解除专注或两小时到期时删除区域与成员 marker；不同施法来源按 cast identity 隔离",
    "垂直边界与 elevation 由 DM 处理",
  ], { status: "compiler-passed" }),
});

export default moveEarth;
