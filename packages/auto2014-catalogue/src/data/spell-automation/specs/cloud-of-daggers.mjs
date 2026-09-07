import {
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  eventTarget,
  graphFragment,
  operation,
  perSlotAboveBase,
  placedTemplate,
  predicate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const cloudDamage = perSlotAboveBase(
  dice(4, 4),
  dice(2, 4),
);

const oncePerTurn = () => predicate("once-per-turn", {
  identity: "zoneInstanceId + targetUuid + turn + phase",
});

const cloudOfDaggers = cleanRoomSpell({
  id: "cloud-of-daggers",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "ActiveAuras 0.12.7 对 measured template 只提供 XY membership；当前不能按 5-ft cube 的垂直边界排除同一 XY、但位于 cube 上方或下方的 creature，由 DM 处理 elevation",
    ],
  },
  fragments: [
    graphFragment({
      id: "cloud-of-daggers-zone-graph",
      actions: [
        publicAction("cast", "放置匕首之云 Place Cloud of Daggers"),
      ],
      artifacts: [
        artifact({
          id: "cloud-of-daggers-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: {
              type: "cube",
              size: 5,
              units: "ft",
            },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("cloud-of-daggers-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Cloud of Daggers",
          markerOnly: true,
          lifecycle: whileArtifact("cloud-of-daggers-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-cloud-of-daggers",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cube",
              size: 5,
              range: 60,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "cloud-of-daggers-zone",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "cloud-of-daggers-entry",
          on: trigger("enter", { zoneId: "cloud-of-daggers-zone" }),
          when: [oncePerTurn()],
          targets: [eventTarget("target:entry")],
          do: [
            operation("damage", {
              id: "entry-damage",
              target: "target:entry",
              formula: cloudDamage,
              damageTypes: ["slashing"],
            }),
          ],
        }),
        rule({
          id: "cloud-of-daggers-turn-start",
          on: trigger("turn-start", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "cloud-of-daggers-membership",
              subject: "effect-target",
            }),
            oncePerTurn(),
          ],
          targets: [eventTarget("target:turn")],
          do: [
            operation("damage", {
              id: "turn-damage",
              target: "target:turn",
              formula: cloudDamage,
              damageTypes: ["slashing"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "DM 在 60 ft 内指定一点，并以该点为中心放置一个边长 5 ft 的 cube；初次放置以及已经位于区域内均不会立即造成伤害",
    "生物在一回合内首次进入区域或在区域内开始回合时受到 4d4 slashing damage，没有豁免",
    "每升一环增加 2d4 slashing damage；entry 与 turn-start 各自在 zone-instance、目标和回合内去重，因此区域内开始回合后离开并在同回合首次重入会再结算一次 entry",
    "一次施法只消耗一个二环或更高环位并建立最长一分钟专注；结束或替换专注会清理模板和成员 marker",
    "不同施法来源的区域、成员和伤害 receipt 相互隔离，区域外 token 保持不变",
    "当前区域成员判定只有 XY 保证；5-ft cube 的垂直边界保持明确 omission",
  ], { status: "compiler-runtime-passed" }),
});

export default cloudOfDaggers;
