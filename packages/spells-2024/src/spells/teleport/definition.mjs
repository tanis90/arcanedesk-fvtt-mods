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

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/7环.htm#Teleport。
// 自动化等级：纯 DM 裁定——施法卡 + 扣槽 + 同行声明；d100 传送结果表与落点由 DM 结算。
const teleport = cleanRoomSpell({
  id: "teleport",
  contract: spellContract({
    ruleset: "2024",
    level: 7,
    school: "con",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目的地必须为你所知且与你在同一存在位面：资格由 DM 确认，系统不校验位面或熟悉程度",
      "熟悉程度（永久法阵/相关物件/非常熟悉/偶尔见过/见过一次或听过描述/查无此地）与 DM 的 d100 结果、遇难/相似区域/偏离地点/抵达地点，全部由 DM 掷骰并按 5R 传送结果表裁决",
      "遇难时全体 3d10 力场伤害、重骰 d100、相似区域与 2d12 里+1d8 方向的偏离落点，由 DM 结算；系统不掷骰、不移动 Token",
      "把施法距离内一个可见物件（大型或更小、未被非自愿生物持握或携带）作为唯一目标传送未自动化：本定义只声明生物乘客",
      "施法者自动同行；乘客集合排除施法者本人，由 DM 确认自愿与可见",
    ],
  },
  fragments: [
    graphFragment({
      id: "teleport-graph",
      actions: [publicAction("cast", "传送术 Teleport")],
      rules: [
        rule({
          id: "cast-teleport",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 0,
              max: 8,
              range: 10,
              units: "ft",
              kind: "creature",
              predicates: [
                excludeSource(),
                predicate("visible-to-source"),
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
    "Cast 是 action，声明 0 至 8 名 10 ft 内由 DM 确认为可见且自愿的乘客（施法者自动同行），只消耗一个七环或更高法术位",
    "施法产生聊天卡，不创建 Effect、不移动任何 Token、不施加状态，也不建立专注",
    "DM 依据目的地熟悉程度掷 1d100 并查阅 5R 传送结果表，处理遇难伤害、相似区域与偏离落点",
    "物件作为唯一目标的传送形态保持明确 omission",
    "目的地资格、位面一致性与乘客自愿/可见资格由 DM 在施法前确认",
  ], { status: "compiler-passed" }),
});

export default teleport;
