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

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/6环.htm#Word_of_Recall。
// 自动化等级：纯 DM 裁定——施法卡 + 扣槽 + 同行者声明；目的地圣殿与 Token 传送由 DM 结算。
const wordOfRecall = cleanRoomSpell({
  id: "word-of-recall",
  contract: spellContract({
    ruleset: "2024",
    level: 6,
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
      "目的地是事先设置好的圣殿及其指定落点：系统没有「预制圣地锚点」目的地原语，公开 Cast 不移动任何 Token，传送由 DM 手动执行",
      "施法者与同行者出现在落点旁最近的未占据位置、以及未预先准备圣殿时法术不产生任何效应，均由 DM 裁定",
      "至多五名 5 ft 内的自愿生物：selected-targets 只记录声明与距离，不校验自愿性；施法者自动同行但不在目标集合内",
      "把某地设为圣殿需要在当地再次施展本法术的资格判定由 DM 维护，系统不记录圣殿清单",
    ],
  },
  fragments: [
    graphFragment({
      id: "word-of-recall-graph",
      actions: [publicAction("cast", "回返真言 Word of Recall")],
      rules: [
        rule({
          id: "cast-word-of-recall",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:companions", {
              min: 0,
              max: 5,
              range: 5,
              units: "ft",
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
    "Cast 是 action，声明 0 至 5 名 5 ft 内由 DM 确认为自愿的同行者（施法者自动同行），只消耗一个六环或更高法术位",
    "施法产生聊天卡，不创建 Effect、不移动任何 Token、不施加状态，也不建立专注",
    "目的地圣殿、指定落点旁最近的未占据位置与实际传送由 DM 按 5R 原文执行",
    "未事先准备圣殿时，DM 判定本次施法不产生任何效应",
    "同行者自愿资格与 5 ft 距离由 DM 在施法前确认",
  ], { status: "compiler-passed" }),
});

export default wordOfRecall;
