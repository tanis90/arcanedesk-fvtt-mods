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
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  spellcastingModifier,
  trigger,
} from "../dsl.mjs";

const healingWord = cleanRoomSpell({
  id: "healing-word",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "evo",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(instant()),
    primaryActionId: "cast",
  }),
  emission: { contentVersion: 6 },
  support: {
    level: "simplified",
    omissions: ["undead 与 construct 的无效目标限制由 DM 判断"],
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
            }),
          ],
          do: [
            consume(),
            operation("healing", {
              id: "cast:healing",
              target: "target:cast",
              formula: perSlotAboveBase(
                add(dice(1, 4), spellcastingModifier()),
                dice(1, 4),
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
      "目标恢复 1d4 + 施法属性，每升一环增加 1d4",
      "非目标不变",
      "只消耗一个所声明环位的法术位",
      "undead 与 construct 的无效目标限制由 DM 判断",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default healingWord;
