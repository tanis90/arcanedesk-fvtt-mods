import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  graphFragment,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/0环.htm#Message。
// 自动化等级：施法卡 + 120 ft 目标声明；低语内容、回复与阻隔规则由 DM 与玩家口头执行。
const message = cleanRoomSpell({
  id: "message",
  contract: spellContract({
    ruleset: "2024",
    level: 0,
    school: "trs",
    components: {
      verbal: false,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "低语内容、只有目标能听到、目标可用只有你能听见的低语回复，均由玩家与 DM 口头执行；系统不发送私信、不生成回复",
      "隔着固态物件施法要求你熟悉目标且知晓其就在阻挡物后方，由 DM 在声明目标时确认",
      "魔法性的沉默效应，以及 1 尺厚石头/金属/木料或薄铅的阻挡，由 DM 判断；系统不做视线或阻隔判定",
      "系统只校验 120 ft 距离与 creature 类型，不校验你是否指向或熟悉目标；目标理解讯息语义由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "message-graph",
      actions: [publicAction("cast", "传讯术 Message")],
      rules: [
        rule({
          id: "cast-message",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 120,
              units: "ft",
              kind: "creature",
            }),
          ],
          do: [],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Cast 是戏法 action，选择一个 120 ft 内的 creature 并产生聊天卡，不消耗法术位、不建立专注",
    "施法不创建 Effect、不施加状态、不改变任何 Actor 的数值",
    "低语内容、只有目标听见、目标以低语回复均由玩家与 DM 口头执行",
    "隔固态物件施法的熟悉度前提、魔法沉默与材料阻隔保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default message;
