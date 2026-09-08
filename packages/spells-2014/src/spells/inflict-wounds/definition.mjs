import {
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
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

const inflictWounds = cleanRoomSpell({
  id: "inflict-wounds",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 6 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "inflict-wounds-graph",
      actions: [publicAction("cast", "致伤术 Inflict Wounds")],
      rules: [
        rule({
          id: "cast-inflict-wounds",
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
            operation("attack-roll", {
              id: "cast:attack",
              target: "target:cast",
              attack: {
                source: "spellcasting",
                range: "melee",
              },
            }),
            operation("damage", {
              id: "cast:damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(3, 10),
                dice(1, 10),
              ),
              damageTypes: ["necrotic"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    "docs/foundry-automation/notes/法术编译器clean-room实施计划.md",
    [
      "action 对接触范围内一个声明目标进行 melee spell attack",
      "命中造成 3d10 necrotic damage，每升一环增加 1d10；暴击翻倍交给 Midi",
      "未命中不造成伤害",
      "只消耗一个所声明环位的法术位",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default inflictWounds;
