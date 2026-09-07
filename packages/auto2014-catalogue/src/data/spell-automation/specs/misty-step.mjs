import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomSpell,
  consume,
  graphFragment,
  instant,
  operation,
  placedPoint,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
} from "../dsl.mjs";

const mistyStep = cleanRoomSpell({
  id: "misty-step",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "con",
    components: {
      verbal: true,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 8 },
  support: {
    level: "simplified",
    omissions: ["落点必须可见且未被占据的合法性由 DM 点击时判断"],
  },
  fragments: [
    graphFragment({
      id: "misty-step-graph",
      actions: [publicAction("cast", "迷踪步 Misty Step", { activationType: "bonus" })],
      rules: [
        rule({
          id: "cast-misty-step",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [placedPoint("target:destination", 30)],
          do: [
            consume(),
            operation("move-token", {
              id: "cast:teleport",
              target: "source",
              destination: "target:destination",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "一次 execute-turn 内等待人类点击合法落点并移动施法者",
    "bonus action 且只消耗一个二环法术位",
    "完成后删除预览与 measured template",
    "不建立专注",
  ], { status: "compiler-runtime-passed" }),
});

export default mistyStep;
