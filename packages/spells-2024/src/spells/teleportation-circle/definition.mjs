import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  graphFragment,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/5环.htm#Teleportation_Circle。
// 自动化等级：marker-only——DM 放置 5 ft 半径法阵并建立 1 轮传送门标记；穿越与印记序列由 DM 执行。
const teleportationCircle = cleanRoomSpell({
  id: "teleportation-circle",
  contract: spellContract({
    ruleset: "2024",
    level: 5,
    school: "con",
    components: {
      verbal: true,
      somatic: false,
      material: true,
    },
    material: {
      cost: 50,
      consumed: true,
    },
    lifetime: spellLifetime(duration(1, "rounds")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "marker-only",
    omissions: [
      "法阵必须画在 10 ft 内的地面：DM 在施法时放置 5 ft 半径（10 ft 直径）圆形模板，位置与地面资格由 DM 确认",
      "目标永久法阵必须与你在同一位面且你知道其印记序列：资格与序列知识由 DM 确认，系统不维护法阵库",
      "任何进入传送门的生物立即出现在目标法阵附近 5 ft 内（被占据时取最近未占据空间）由 DM 拖动 Token 处理；系统不检测进入、不跨 Scene 传送",
      "升环无额外效果；「对同一地点连续 365 天施法创造永久法阵」、首次获得施法能力时习得两个序列、花一分钟记录新序列，均由 DM 记录",
      "50 GP 珍稀墨水作为材料只写入 contract，不自动扣库存",
    ],
  },
  fragments: [
    graphFragment({
      id: "teleportation-circle-graph",
      actions: [
        publicAction("cast", "传送法阵 Teleportation Circle", {
          activationType: "minute",
        }),
      ],
      artifacts: [
        cleanRoomEffect("teleportation-circle-portal", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Teleportation Circle: Portal",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-teleportation-circle",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "circle",
              size: 5,
              range: 10,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-portal",
              artifactId: "teleportation-circle-portal",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Cast 是一分钟 Activity，DM 在 10 ft 内地面放置 5 ft 半径圆形模板，且只消耗一个五环或更高法术位",
    "施法在施法者身上建立持续 1 轮、非专注的 Teleportation Circle: Portal 来源标记；到期或被替换时清理",
    "标记不打开跨 Scene 传送门、不检测进入、不传送 Token，也不施加状态",
    "目标法阵的印记序列知识、目标位面与永久法阵库由 DM 确认；穿越落点由 DM 拖动 Token 处理",
    "365 天创造永久法阵、序列学习与 50 GP 墨水材料保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default teleportationCircle;
