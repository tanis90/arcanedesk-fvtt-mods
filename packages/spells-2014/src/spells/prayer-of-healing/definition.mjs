import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  action,
  activation,
  add,
  cleanRoomSpell,
  consume,
  contentRef,
  dice,
  graphFragment,
  instant,
  operation,
  perSlotAboveBase,
  rule,
  selected,
  spellContract,
  spellLifetime,
  spellcastingModifier,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

const prayerOfHealing = cleanRoomSpell({
  id: "prayer-of-healing",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "evo",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  content: contentRef("prayer-of-healing"),
  emission: { contentVersion: 6 },
  support: {
    level: "simplified",
    omissions: [
      "10 分钟施法期间的世界时间推进与中断仍由 DM 判断",
      "undead 与 construct 的无效目标限制由 DM 判断",
    ],
  },
  fragments: [
    graphFragment({
      id: "prayer-of-healing-graph",
      actions: [
        action({
          id: "cast",
          name: "治疗祷言 Prayer of Healing",
          activation: activation("minute", 10),
          visibility: "public",
        }),
      ],
      rules: [
        rule({
          id: "cast-prayer-of-healing",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 6,
              range: 30,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("healing", {
              id: "cast:healing",
              target: "target:cast",
              formula: perSlotAboveBase(
                add(dice(2, 8), spellcastingModifier()),
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
    COMPILER_MIGRATION_LOG,
    [
      "10 minute cast 选择 30 ft 内一至六个声明目标",
      "每个目标恢复 2d8 + 施法属性，每高一环增加 1d8",
      "非目标不变",
      "只消耗一个二环或更高法术位",
      "施法期间的世界时间推进与中断，以及 undead/construct 无效目标限制由 DM 判断",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default prayerOfHealing;
