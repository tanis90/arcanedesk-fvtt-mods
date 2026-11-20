import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  consume,
  graphFragment,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/4环.htm#Stone_Shape。
// 自动化等级：纯 DM 裁定——施法卡 + 扣槽；被塑形石质物件与形态由 DM 在场景中执行。
const stoneShape = cleanRoomSpell({
  id: "stone-shape",
  contract: spellContract({
    ruleset: "2024",
    level: 4,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "target-kind 不支持 object：公开 Cast 以 self 声明仅代表施法者完成一次触碰塑形，被塑形的石质物件或岩石由 DM 在场景中指定；Item/Activity 的射程因此显示为自身（5R 头部为触碰）",
      "中型或更小的石质物件、任何方向不超过 5 ft 的岩石部分、厚度不超过 5 ft 的石墙通道、石门与门框封死等尺寸与形态判定由 DM 执行",
      "最多两条铰链与一道闩、不能塑造更复杂的机械结构由 DM 判断",
      "本实现不追踪物件状态、不产生任何 Effect，也不改变 Actor 数值、状态或 HP",
    ],
  },
  fragments: [
    graphFragment({
      id: "stone-shape-graph",
      actions: [publicAction("cast", "塑石术 Stone Shape")],
      rules: [
        rule({
          id: "cast-stone-shape",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [consume()],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Cast 是 action，只消耗一个四环或更高法术位，不建立专注",
    "施法产生聊天卡；不创建 Effect、不施加状态，也不移动 Token",
    "被塑形的石质物件/岩石部分、5 ft 尺寸上限与可塑造的机械复杂度由 DM 按 5R 原文执行",
    "施法不改变任何 Actor 的数值、状态或 HP；物件状态不进入自动化追踪",
  ], { status: "compiler-passed" }),
});

export default stoneShape;
