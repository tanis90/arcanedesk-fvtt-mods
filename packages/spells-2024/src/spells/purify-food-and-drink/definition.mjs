import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  consume,
  graphFragment,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/1环.htm#Purify_Food_and_Drink。
// 自动化等级：utility marker-only——10 ft 内 5 ft 球状区域输入；毒素/腐败清除由 DM 执行。
const purifyFoodAndDrink = cleanRoomSpell({
  id: "purify-food-and-drink",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    ritual: true,
    lifetime: spellLifetime(),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "DM 在 10 ft 内放置一个 5 ft 半径球状区域；模板只在施法交互时作为区域参考，不绑定 artifact、不结算成员效果、也不自动清理，DM 可自行删除；球内的食物与饮品由 DM 判定",
      "「非魔法食物与饮品」的资格（排除魔法食物、魔法药剂与活体生物）由 DM 判断，系统不扫描 Item",
      "「移除其中的毒素和腐败」是物件状态变更，系统不追踪食物/饮品 Item 的毒素或腐败，也不删除任何 Item；由 DM 在场景中说明",
      "以仪式施放（不消耗法术位、施法时间 +10 分钟）不消耗法术位；本自动化只覆盖消耗法术位的施法路径，仪式施法由 DM 手工记录",
    ],
  },
  fragments: [
    graphFragment({
      id: "purify-food-and-drink-graph",
      actions: [publicAction("cast", "净化饮食 Purify Food and Drink")],
      rules: [
        rule({
          id: "cast-purify-food-and-drink",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "sphere",
              size: 5,
              range: 10,
              evaluation: "snapshot",
            }),
          ],
          do: [consume()],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "以 action 施法：DM 在施法者 10 ft 内放置一个 5 ft 半径球状区域，只消耗一个一环或更高法术位，不建立专注、不产生持续 Effect",
    "5 ft 半径球内非魔法食物与饮品中的毒素和腐败由 DM 按 5R 原文清除并说明，系统不改变任何 Item 或 Actor 数值",
    "施法不选择生物目标、不造成伤害、不施加状态",
    "仪式施法不消耗法术位，由 DM 手工记录；本自动化只覆盖消耗法术位的施法路径",
  ], { status: "compiler-passed" }),
});

export default purifyFoodAndDrink;
