import {
  QA_LOG,
  add,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  dice,
  duration,
  graphFragment,
  operation,
  perSlotAboveBase,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
} from "../dsl.mjs";

const falseLife = cleanRoomSpell({
  id: "false-life",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "一小时结束时若本法术提供的临时生命值仍未耗尽，当前通用 effect lifecycle 不会按来源精确清除该临时生命值，由 DM 清理",
    ],
  },
  fragments: [
    graphFragment({
      id: "false-life-graph",
      actions: [publicAction("cast", "虚假生命 False Life")],
      artifacts: [
        cleanRoomEffect("false-life-marker", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "False Life",
          lifecycle: duration(1, "hours"),
        }),
      ],
      rules: [
        rule({
          id: "cast-false-life",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("healing", {
              id: "cast:temporary-hp",
              target: "target:cast",
              formula: perSlotAboveBase(
                add(dice(1, 4), constant(4)),
                constant(5),
              ),
              healingTypes: ["temphp"],
            }),
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "false-life-marker",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "self cast 只消耗一个法术位并获得 1d4 + 4 temporary HP",
    "每升一环额外获得 5 temporary HP",
    "施法者获得最长一小时的可见 False Life marker",
    "仍存在的来源临时生命值在 marker 到期时由 DM 清理",
  ], { status: "compiler-runtime-passed" }),
});

export default falseLife;
