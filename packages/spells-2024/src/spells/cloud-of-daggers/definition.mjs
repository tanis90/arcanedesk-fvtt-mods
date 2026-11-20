import {
  QA_LOG,
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
} from "@arcanedesk/spell-compiler/dsl";

// L4 移植批（非 SRD，spells24 无源文档）：G 桶 + 2014 recipe cloud-of-daggers。
// 5R 锚点 二环.htm#Cloud_of_Daggers。与 2014 差异：放置时立即造成一次伤害、结算时机由"回合开始"改为"回合结束"、并写明魔法动作移动立方；骰面 4d4/+2d4 不变。
const cloudDamage = perSlotAboveBase(
  dice(4, 4),
  dice(2, 4),
);

const oncePerTurn = () => predicate("once-per-turn", {
  identity: "zoneInstanceId + targetUuid + turn",
});

const cloudOfDaggers = cleanRoomSpell({
  id: "cloud-of-daggers",
  contract: spellContract({
    ruleset: "2024",
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
      "施法后的每个自己回合可用一个魔法动作把立方传送至多 30 ft；runtime 没有区域位移原语，模板拖动、action economy 与 30 ft 合法距离由 DM 校验",
      "立方区域被移动到生物所在空间（而非生物自己进入）时应补一次伤害；enter 事件只从 token 移动检测，这类结算由 DM 手动补掷",
    ],
  },
  fragments: [
    graphFragment({
      id: "cloud-of-daggers-zone-graph",
      actions: [
        publicAction("cast", "匕首之云 Cloud of Daggers"),
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
            operation("damage", {
              id: "appear-damage",
              target: "target:cast",
              formula: cloudDamage,
              damageTypes: ["slashing"],
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
          id: "cloud-of-daggers-turn-end",
          on: trigger("turn-end", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "cloud-of-daggers-membership",
              subject: "effect-target",
            }),
            oncePerTurn(),
          ],
          targets: [eventTarget("target:turn-end")],
          do: [
            operation("damage", {
              id: "turn-end-damage",
              target: "target:turn-end",
              formula: cloudDamage,
              damageTypes: ["slashing"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 在 60 ft 内指定一点，并以该点为中心放置一个边长 5 ft 的 cube；放置瞬间区域内每名 creature 立即受到一次伤害",
    "生物在一回合内首次进入区域或在该区域内结束回合时受到 4d4 slashing damage，没有豁免",
    "每升一环增加 2d4 slashing damage；appear、entry 与 turn-end 各自在 zone-instance、目标和回合内去重，同一生物一回合内只会结算一次该伤害（进入后在同回合内结束回合不再重复结算）",
    "一次施法只消耗一个二环或更高环位并建立最长一分钟专注；结束或替换专注会清理模板和成员 marker",
    "不同施法来源的区域、成员和伤害 receipt 相互隔离，区域外 token 保持不变",
    "魔法动作移动立方、模板被移动到生物空间、以及 5-ft cube 的垂直边界均保持明确 DM omission",
  ], { status: "compiler-passed" }),
});

export default cloudOfDaggers;
