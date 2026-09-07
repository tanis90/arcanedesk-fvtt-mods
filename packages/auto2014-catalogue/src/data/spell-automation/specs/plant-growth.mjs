import {
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  contentRef,
  graphFragment,
  instant,
  manual,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  whileArtifact,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const plantGrowth = cleanRoomSpell({
  id: "plant-growth",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  content: contentRef("plant-growth"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "穿过区域的生物每移动 1 ft 需花费 4 ft 移动力，不能等价为按固定比例削减角色 movement speed；当前 DSL/runtime 没有 zone movement-cost 原语，暂由 DM 处理（与 entangle/spike-growth 的 difficult terrain 缺口径一致）",
      "施法者可以排除区域内任意大小的子区域；当前 DSL 没有模板布尔裁剪或排除区原语，DM 放置后手动调整模板或忽略",
      "以 8 小时施放的丰饶土地用途属于非战斗范围，不实现",
      "区域是否已有足够普通植物、目标植物是否属于普通植物由 DM 判断；当前自动化不做场景植被判定",
      "ActiveAuras 对 measured template 只提供 XY membership；垂直边界与不同 elevation 的成员关系由 DM 处理",
      "区域没有到期与自动清理：DM 手动删除模板结束法术（这是 manual lifecycle 的语义）",
    ],
  },
  fragments: [
    graphFragment({
      id: "plant-growth-zone-graph",
      actions: [publicAction("cast", "放置植物滋长 Place Plant Growth")],
      artifacts: [
        artifact({
          id: "plant-growth-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "circle", radius: 100, units: "ft" },
            stationary: true,
          },
          lifecycle: manual(),
        }),
        cleanRoomEffect("plant-growth-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Plant Growth Area",
          markerOnly: true,
          lifecycle: whileArtifact("plant-growth-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-plant-growth",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "circle",
              size: 100,
              range: 150,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "plant-growth-zone",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "DM 在施法者 150 ft 内放置一个 100-ft-radius 的固定地面圆形区域，并只消耗一个三环或更高法术位",
    "瞬时法术不建立专注；放置后 zone 持久存在且没有到期，DM 手动删除模板才结束法术并连带清理成员 marker",
    "任意阵营 creature 进入与离开区域时只动态获得或移除本次施法实例的 Plant Growth Area 成员 marker；初次放置与进出都不运行豁免或伤害 workflow",
    "重复施法按 cast identity 产生相互独立的区域实例，删除其一不影响其他来源的区域",
    "每 1 ft 花费 4 ft 移动力的移动消耗、排除子区域、8 小时丰饶用途与普通植物判定保持明确 omission，不以速度修改或额外模板几何冒充",
    "成员 marker 只有 XY 保证；垂直边界由 DM 处理",
  ], { status: "compiler-runtime-passed" }),
});

export default plantGrowth;
