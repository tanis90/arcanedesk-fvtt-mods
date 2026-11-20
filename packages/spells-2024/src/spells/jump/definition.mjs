import {
  acceptance,
  add,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  duration,
  graphFragment,
  levelsAboveBase,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 C 桶 recipe-invalid，c-dm）：2024 改为附赠动作，效果不再是
// 「跳跃距离三倍」，而是每回合一次花 10 尺移动力跳至多 30 尺；升环改为加目标。
// 5R 锚点：玩家手册2024/法术详述/1环.htm#Jump。
const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const jump = cleanRoomSpell({
  id: "jump",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "2024 的效果是「每回合一次、消耗 10 尺移动力跳到至多 30 尺」；DSL 只有按倍率放大既有跳跃距离的 scale-jump-distance，没有固定跳跃距离或移动力消耗原语，跳跃结算由 DM 执行",
      "目标是否自愿由 DM 判断；selected-targets 不校验意愿",
    ],
  },
  fragments: [
    graphFragment({
      id: "jump-graph",
      actions: [
        publicAction("cast", "跳跃术 Jump", {
          activationType: "bonus",
        }),
      ],
      artifacts: [
        cleanRoomEffect("jump", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Jump",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-jump",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: add(constant(1), levelsAboveBase()),
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-jump",
              artifactId: "jump",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "bonus action 触碰一个声明生物，每升一环可额外选择一个目标，并只消耗一个所声明环位的法术位",
    "目标获得独立的 source-target Jump marker，提醒 DM 该生物在法术持续期间可每回合一次花 10 尺移动力跳到至多 30 尺",
    "不再放大既有跳跃距离（2014 的三倍口径在 2024 已删除），也不改变任何移动速度",
    "效果持续一分钟且不建立专注；对同一目标重施时 replace 原 marker",
    "跳跃距离、移动力消耗与落点是否合法保持明确 DM omission，不冒充已自动化",
  ], { status: "compiler-passed" }),
});

export default jump;
