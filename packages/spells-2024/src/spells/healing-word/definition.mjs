import {
  acceptance,
  add,
  cleanRoomSpell,
  consume,
  dice,
  graphFragment,
  instant,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  spellcastingModifier,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 C 桶 recipe-invalid，c-dm）：2024 治疗 2d4 + 施法属性、每环 +2d4，
// 学派改防护，并取消 2014 的构装/亡灵无效限制；附赠动作与 60 尺不变。
// 5R 锚点：玩家手册2024/法术详述/1环.htm#Healing_Word。
const healingWord = cleanRoomSpell({
  id: "healing-word",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "abj",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(instant()),
    primaryActionId: "cast",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "visible-to-source 目前只进入 interaction projection，不由通用 runtime 独立校验视线；DM 负责只声明施法者可见的目标",
    ],
  },
  fragments: [
    graphFragment({
      id: "healing-word-graph",
      actions: [
        publicAction("cast", "治愈真言 Healing Word", {
          activationType: "bonus",
        }),
      ],
      rules: [
        rule({
          id: "cast-healing-word",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 60,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [
            consume(),
            operation("healing", {
              id: "cast:healing",
              target: "target:cast",
              formula: perSlotAboveBase(
                add(dice(2, 4), spellcastingModifier()),
                dice(2, 4),
              ),
              healingTypes: ["healing"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    "docs/foundry-automation/notes/法术编译器clean-room实施计划.md",
    [
      "bonus action 选择 60 ft 内一个声明 creature",
      "目标恢复 2d4 + 施法属性调整值，每升一环增加 2d4（2024 口径）",
      "非目标不变",
      "只消耗一个所声明环位的法术位",
      "2024 不再排除构装与亡灵目标",
    ],
    { status: "compiler-passed" },
  ),
});

export default healingWord;
