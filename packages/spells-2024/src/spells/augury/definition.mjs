import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  consume,
  graphFragment,
  instant,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/2环.htm#Augury。
// 自动化等级：纯 DM 裁定——一分钟施法只产出聊天卡并扣槽；预兆内容与重复施法概率由 DM 给出。
const augury = cleanRoomSpell({
  id: "augury",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "div",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 25,
      consumed: false,
    },
    ritual: true,
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "预兆（吉/凶/吉凶并存/无）由 DM 从 5R 表中选择并解释；自动化不骰预兆、不评估行动计划",
      "两次长休之间重复施法的累积 25% 无结果概率由 DM 记录与判定",
      "环境因素、可能改变结果的其他法术与预言的适用范围由 DM 裁定",
      "仪式施法不消耗法术位；Cast action 不区分仪式版本，以法术位施展时正常扣槽，仪式版本由 DM 手动免扣",
    ],
  },
  fragments: [
    graphFragment({
      id: "augury-graph",
      actions: [
        publicAction("cast", "卜筮术 Augury", {
          activationType: "minute",
        }),
      ],
      rules: [
        rule({
          id: "cast-augury",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [consume()],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "施法入口为一分钟 utility，不选择 token、不进行豁免，只消耗一个二环或更高法术位",
    "施法产生聊天卡，不创建持续标记、不施加状态，持续时间为立即",
    "预兆结果、解释与重复施法的累积失败概率由 DM 按 5R 原文给出，自动化不介入",
    "25 GP 占卜道具只写入 contract material，不自动扣库存",
  ], { status: "compiler-passed" }),
});

export default augury;
