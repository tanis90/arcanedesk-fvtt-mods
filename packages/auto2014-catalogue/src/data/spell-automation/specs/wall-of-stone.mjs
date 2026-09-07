import {
  acceptance,
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
  whileSpellActive,
} from "../dsl.mjs";

const WALL_OF_STONE_PLACEMENT_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wall-of-stone-placement-qa-2026-08-27.md";

const wallOfStone = cleanRoomSpell({
  id: "wall-of-stone",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "只实现一条固定 100-ft-long、5-ft-wide 的二维直墙模板，作为十块 10×10 ft 墙板首尾相接的简化；任意排列、非直线形状、少于十块和 10×20 ft/厚 3 in 变体由 DM 使用标准工具调整",
      "墙不得占据生物或物件的空间，并须与已有石材融合且获得坚固支撑；桥、坡道、垛口等造型，以及跨度超过 20 ft 时缩小面板并建立支撑，均由 DM 裁定和绘制",
      "墙出现时若切过生物空间，由 DM 选择将其推到哪一侧；若墙与其他坚固表面会把生物完全围住，由 DM 处理 Dexterity save、成功后使用 reaction 移动至多其速度并离开包围的结果",
      "模板只是可见的 XY 占位参考；系统不创建 Foundry WallDocument，不阻挡移动或视线，也不追踪每块面板 AC 15、每英寸厚度 30 HP、伤害、缺口、破坏或坍塌；这些均由 DM 通过标准 Foundry UI 处理",
      "专注提前结束、被替换或到期时自动删除直墙模板；完整维持 10 分钟后的永久化不自动判断，DM 必须在结束专注前复制模板或转换为正式 Wall/绘图实体",
    ],
  },
  fragments: [
    graphFragment({
      id: "wall-of-stone-graph",
      actions: [publicAction("cast", "石墙术 Wall of Stone")],
      artifacts: [
        cleanRoomEffect("wall-of-stone-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Wall of Stone",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-wall-of-stone",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "line",
              size: 100,
              width: 5,
              range: 120,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-wall-of-stone-source",
              artifactId: "wall-of-stone-source",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(WALL_OF_STONE_PLACEMENT_QA_RECEIPT, [
    "唯一 public Cast 使用 placed-template 输入；角色卡点击与 Context Exec 调用同一 compiler-emitted Activity，两条路径都进入受信画布放置，agent 不提供坐标、模板 UUID 或内部 Activity ID",
    "DM 在施法者 120 ft 内放置并定向一条固定 100-ft-long、5-ft-wide 的二维 line；一次施法只消费一个五环或更高法术位，并建立最长 10 分钟的原生专注和 source-scoped Wall of Stone marker",
    "Cast 创建一个绑定于本次专注、锚定于落点且不跟随施法者的持续模板；模板只是墙体占位参考，不产生豁免、伤害、自动移动、Actor membership、WallDocument、碰撞或视线状态差，10 ft 高度由 DM 裁定",
    "解除、替换、到期或手动结束专注时，按 cast 精确清理直墙模板和来源 marker，不影响其他施法来源或 DM 手工建立的墙体",
    "十块墙板的任意排列、厚度与支撑、困住生物时的 Dexterity save/反应移动、碰撞、AC/HP/破坏/坍塌和专注满 10 分钟的永久化均由 DM 处理；完整维持后 DM 在结束专注前复制模板或转换为 Wall/绘图实体",
  ], { status: "compiler-runtime-passed" }),
});

export default wallOfStone;
