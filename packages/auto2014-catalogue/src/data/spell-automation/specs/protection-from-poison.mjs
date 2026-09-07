import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  grantResistance,
  grantSavingThrowAdvantage,
  graphFragment,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const protectionFromPoison = cleanRoomSpell({
  id: "protection-from-poison",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  emission: { contentVersion: 6 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "protection-from-poison-graph",
      actions: [publicAction("cast", "防护毒素 Protection from Poison")],
      artifacts: [
        cleanRoomEffect("poison-protection", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Protection from Poison",
          modifiers: [
            grantResistance("poison"),
            grantSavingThrowAdvantage("poison"),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-protection",
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
            operation("remove-statuses", {
              id: "cast:remove-poisoned",
              target: "target:cast",
              statuses: ["poisoned"],
            }),
            operation("apply-artifact", {
              id: "cast:apply-protection",
              artifactId: "poison-protection",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "action 选择一个 touch 范围内的 creature，并只消耗一个二环或更高环位",
      "立即清除目标现存的 poisoned 且不删除其他状态或 Active Effect",
      "目标获得持续一小时的 poison damage resistance",
      "目标对毒素相关 saving throw 获得优势",
      "不建立专注，效果到期后自动清理",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default protectionFromPoison;
