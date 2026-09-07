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

const massHealingWord = cleanRoomSpell({
  id: "mass-healing-word",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "evo",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 5 },
  support: {
    level: "simplified",
    omissions: ["undead 与 construct 的无效目标限制由 DM 判断"],
  },
  fragments: [
    graphFragment({
      id: "mass-healing-word-graph",
      actions: [
        publicAction("cast", "群体治愈真言 Mass Healing Word", {
          activationType: "bonus",
        }),
      ],
      rules: [
        rule({
          id: "cast-mass-healing-word",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 6,
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
      "bonus action 选择 60 ft 内一至六个声明目标",
      "每个目标恢复 1d4 + 施法属性，每高一环增加 1d4",
      "非目标不变",
      "只消耗一个三环或更高法术位",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default massHealingWord;
