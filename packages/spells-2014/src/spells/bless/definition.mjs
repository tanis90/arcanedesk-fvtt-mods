import {
  QA_LOG,
  acceptance,
  add,
  allAttackRolls,
  allSavingThrows,
  bonus,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  dice,
  duration,
  graphFragment,
  levelsAboveBase,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const bless = cleanRoomSpell({
  id: "bless",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 6 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "bless-graph",
      actions: [publicAction("cast", "祝福术 Bless")],
      artifacts: [
        cleanRoomEffect("bless", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          modifiers: [
            bonus(allAttackRolls(), dice(1, 4)),
            bonus(allSavingThrows(), dice(1, 4)),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-bless",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: add(constant(3), levelsAboveBase()),
              range: 30,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-bless",
              artifactId: "bless",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    QA_LOG,
    [
      "一环最多三个声明目标获得攻击与豁免 +1d4，每升一环增加一个目标",
      "建立专注",
      "非目标不变",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default bless;
