import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  consume,
  graphFragment,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/3环.htm#Sending。
// 自动化等级：纯 DM 裁定——施法卡 + 扣槽；25 词讯息、回复、跨位面失联与屏蔽由 DM 执行。
const sending = cleanRoomSpell({
  id: "sending",
  contract: spellContract({
    ruleset: "2024",
    level: 3,
    school: "div",
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
      "目标必须是「你遇到过的，或某人遇到过且向你描述过的」生物：资格由 DM 在声明目标时确认，系统不校验相识关系",
      "25 词上限、讯息内容、目标立即以同样方式回复，均由玩家与 DM 口头执行；系统不生成私信或回复",
      "目标与你不在同一存在位面时 5% 无法到达、失联结果告知，由 DM 决定是否骰",
      "目标收到讯息后可屏蔽你 8 小时；再次发送失败与「短讯被屏蔽」的告知由 DM 记录与裁定",
      "施法距离为无限：目标声明使用 special 距离，系统不换算实际距离",
      "一段铜线作为材料只写入 contract，不自动扣库存",
    ],
  },
  fragments: [
    graphFragment({
      id: "sending-graph",
      actions: [publicAction("cast", "传讯术 Sending")],
      rules: [
        rule({
          id: "cast-sending",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "spec",
              kind: "creature",
            }),
          ],
          do: [consume()],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Cast 是 action，选择一个任意距离的 creature 声明目标并只消耗一个三环或更高法术位",
    "施法产生聊天卡，不创建 Effect、不施加状态、不改变任何 Actor 的数值，不建立专注",
    "25 词讯息、目标回复、跨位面 5% 失联与 8 小时屏蔽均由玩家与 DM 按 5R 原文执行",
    "目标相识资格与铜线材料保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default sending;
