import {
  add,
  acceptance,
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
  spellcastingModifier,
  spellContract,
  spellLifetime,
  trigger,
} from "../dsl.mjs";

const cureWounds = cleanRoomSpell({
  id: "cure-wounds",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 7 },
  support: {
    level: "simplified",
    omissions: ["undead 与 construct 的无效目标限制由 DM 判断"],
  },
  fragments: [
    graphFragment({
      id: "cure-wounds-graph",
      actions: [publicAction("cast", "疗伤术 Cure Wounds")],
      rules: [
        rule({
          id: "cast-cure-wounds",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("healing", {
              id: "cast:healing",
              target: "target:cast",
              formula: perSlotAboveBase(
                add(dice(1, 8), spellcastingModifier()),
                dice(1, 8),
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
      "action 选择一个 touch 范围内的 creature",
      "目标恢复 1d8 + 施法属性，每升一环增加 1d8",
      "非目标不变",
      "只消耗一个法术位",
      "undead 与 construct 的无效目标限制由 DM 判断",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default cureWounds;
