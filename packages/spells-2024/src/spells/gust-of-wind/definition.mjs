import {
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  eventTarget,
  graphFragment,
  operation,
  placedTemplate,
  predicate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 C 桶 recipe-invalid，c-dm）：2024 的豁免时机是「风出现时」与
// 「在风道内结束回合」，2014 只在回合开始时结算；推离 15 尺、双倍逆行移动与附赠改向不变。
// 5R 锚点：玩家手册2024/法术详述/2环.htm#Gust_of_Wind。
const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const gustOfWind = cleanRoomSpell({
  id: "gust-of-wind",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "evo",
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
      "Strength save 失败后应沿风向远离施法者 15 ft；位移、碰撞、墙体与合法落点由 DM 处理",
      "区域内生物朝施法者移动时每移动 1 ft 消耗 2 ft movement；当前缺少只作用于特定方向的移动成本原语，由 DM 处理",
      "吹散气体或蒸气、熄灭无保护火焰以及有保护火焰的 50% 熄灭判定由 DM 处理",
      "持续线不会自动绑定施法者 token；施法者移动后的重定位，以及每回合附赠动作改变风向的时机与模板旋转由 DM 手工执行",
      "ActiveAuras 0.12.7 的 line membership 只检查 XY；向上或向下吹出的三维方向及不同 elevation 的成员关系由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "gust-of-wind-zone-graph",
      actions: [
        publicAction("cast", "放置造风术 Place Gust of Wind"),
      ],
      artifacts: [
        artifact({
          id: "gust-of-wind-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "movable-template",
            shape: {
              type: "line",
              size: 60,
              width: 10,
              units: "ft",
            },
            stationary: false,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("gust-of-wind-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Gust of Wind",
          markerOnly: true,
          lifecycle: whileArtifact("gust-of-wind-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-gust-of-wind",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "line",
              size: 60,
              width: 10,
              range: null,
              rangeUnits: "self",
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "gust-of-wind-zone",
              target: "target:cast",
            }),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["str"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "gust-of-wind-turn-end",
          on: trigger("turn-end", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "gust-of-wind-membership",
              subject: "effect-target",
            }),
            predicate("once-per-turn", {
              identity: "zoneInstanceId + targetUuid + turn",
            }),
          ],
          targets: [eventTarget("target:turn")],
          do: [
            operation("saving-throw", {
              id: "turn-end-save",
              ability: ["str"],
              target: "target:turn",
              onSave: "none",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "DM 从施法者位置确定一条 60-ft-long、10-ft-wide line；施法放置时区域内每个 creature 立即进行一次 Strength save（2024 的「出现时」口径）",
    "在区域内结束自己回合的 creature 也必须再作一次 Strength save；同一 zone 实例、目标与回合 receipt 防止重复请求",
    "成功施法只消耗一个二环或更高环位并建立最长一分钟专注；结束或替换专注会清理模板和成员 marker",
    "DM 手工旋转或重定位模板后会刷新区域成员；失败后的 15-ft push 生成真实 workflow outcome 供 DM 位移",
    "朝施法者移动的双倍成本、气体与火焰互动，以及 bonus-action 改向保持明确 omission",
    "持续线的成员判定只有 XY 保证；垂直方向与 elevation 由 DM 处理",
  ], { status: "compiler-passed" }),
});

export default gustOfWind;
