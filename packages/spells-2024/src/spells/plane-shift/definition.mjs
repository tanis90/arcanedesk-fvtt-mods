import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  consume,
  excludeSource,
  graphFragment,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/7环.htm#Plane_Shift。
// 自动化等级：纯 DM 裁定——施法卡 + 扣槽 + 同行声明；目标位面与落点由 DM 裁决。
const planeShift = cleanRoomSpell({
  id: "plane-shift",
  contract: spellContract({
    ruleset: "2024",
    level: 7,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 250,
      consumed: false,
    },
    lifetime: spellLifetime(),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目的地只能概括指名（如黄铜之城、迪斯帕特宫殿），实际出现在目的地内或其附近由 DM 按判断决定；系统不维护位面地图或落点",
      "全体必须手牵手围成一圈且自愿：牵手与自愿资格由 DM 在声明目标时确认，系统只记录 willing 声明",
      "另法：带往另一位面已知印记序列的传送法阵；法阵容量不足时出现在最近未占据空间，均由 DM 手动处理",
      "分叉金属棒必须与一个存在位面调谐、价值 250 GP 以上且不消耗：材料只写入 contract，不自动扣库存",
      "升环无额外效果；施法者自动同行，乘客集合排除施法者本人",
      "系统不移动 Token、不切换 Scene、不施加状态，也不建立专注",
    ],
  },
  fragments: [
    graphFragment({
      id: "plane-shift-graph",
      actions: [publicAction("cast", "位面转移 Plane Shift")],
      rules: [
        rule({
          id: "cast-plane-shift",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 0,
              max: 8,
              range: null,
              units: "touch",
              kind: "creature",
              predicates: [
                excludeSource(),
                predicate("willing"),
              ],
            }),
          ],
          do: [consume()],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Cast 是 action，声明 0 至 8 名触碰范围内自愿同行者（施法者自动同行），只消耗一个七环或更高法术位",
    "施法产生聊天卡，不移动 Token、不切换 Scene、不施加状态，也不建立专注",
    "目标位面与落点由 DM 根据概括指名的目的地或已知传送法阵印记序列裁决",
    "手牵手的同行要求、法阵容量不足时的最近未占据空间，与 250 GP 调谐金属棒材料保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default planeShift;
