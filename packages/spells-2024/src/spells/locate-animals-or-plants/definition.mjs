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

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/2环.htm#Locate_Animals_or_Plants。
// 自动化等级：utility marker-only——施法卡与扣槽；5 里内的最近个体、方位与距离由 DM 口述。
const locateAnimalsOrPlants = cleanRoomSpell({
  id: "locate-animals-or-plants",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "div",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    ritual: true,
    lifetime: spellLifetime(),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "点名的野兽生物、植物生物或非魔法植物种类由玩家在桌面声明；系统不提供种类选择器，也不扫描场景或 Actor",
      "5 里内是否存在该类生物/植物、其中最近的个体与施法者的相对方位和距离，全部由 DM 依据 5R 原文口述，系统不生成结果",
      "法术只识别法定的野兽（beast）与植物（非魔法植物），不会指出构装、精类或魔法植物；该资格判定由 DM 负责",
      "以仪式施放（不消耗法术位、施法时间 +10 分钟）不消耗法术位；本自动化只覆盖消耗法术位的施法路径，仪式施法由 DM 手工记录",
    ],
  },
  fragments: [
    graphFragment({
      id: "locate-animals-or-plants-graph",
      actions: [publicAction("cast", "动植物定位术 Locate Animals or Plants")],
      rules: [
        rule({
          id: "cast-locate-animals-or-plants",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [consume()],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "以 action 施法只消耗一个二环或更高法术位，不建立专注、不产生持续 Effect，也不选择目标",
    "5 里内最近个体的方位与距离由 DM 依据 5R 原文口述；系统不扫描场景、不生成发现结果",
    "施法不改变任何 Actor 的数值、状态或 HP",
    "仪式施法不消耗法术位，由 DM 手工记录；本自动化只覆盖消耗法术位的施法路径",
  ], { status: "compiler-passed" }),
});

export default locateAnimalsOrPlants;
