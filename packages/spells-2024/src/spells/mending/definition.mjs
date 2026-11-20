import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  graphFragment,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/0环.htm#Mending。
// 自动化等级：utility marker-only——1 分钟施法卡；物件破损的判定与修复由 DM 执行，不产生 Effect。
const mending = cleanRoomSpell({
  id: "mending",
  contract: spellContract({
    ruleset: "2024",
    level: 0,
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
      "target-kind 不支持 object：公开 Cast 以 self 声明仅代表「施法者完成一次触碰修复」，被修复的物件由 DM 在场景中指定",
      "「任意方向都不超过 1 尺的破损或裂缝」的尺寸判定、修复后不留痕迹、以及魔法物品只修复物理结构不恢复魔法，全部由 DM 判断",
      "戏法不消耗法术位、不建立专注；本实现不追踪物件状态，也不产生任何 Effect",
    ],
  },
  fragments: [
    graphFragment({
      id: "mending-graph",
      actions: [publicAction("cast", "修复术 Mending", { activationType: "minute" })],
      rules: [
        rule({
          id: "cast-mending",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Cast 是一个 1 分钟 Activity，戏法不消耗法术位、不建立专注，也不产生持续 Effect",
    "施法只产生聊天卡；被修复物件的选择与 1 尺破损上限由 DM 依据 5R 原文执行",
    "魔法物品只修复物理结构、不恢复魔法，由 DM 说明",
    "施法不改变任何 Actor 的数值、状态或 HP",
  ], { status: "compiler-passed" }),
});

export default mending;
