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

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：不再召唤精类生物，改为自身 10 ft 光环内
// 进入/回合结束感知豁免 5d8 力场（半伤）与附赠撤离。
// 5R 锚点：5R 玩家手册2024 4环.htm#Conjure_Woodland_Beings。
const woodlandDamage = perSlotAboveBase(
  dice(5, 8),
  dice(1, 8),
);

const auraPulse = () => predicate("once-per-turn", {
  identity: "zoneInstanceId + targetUuid + turn",
});

const conjureWoodlandBeings = cleanRoomSpell({
  id: "conjure-woodland-beings",
  contract: spellContract({
    ruleset: "2024",
    level: 4,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "5R 的光环是跟随施法者的 emanations；zone 原语只有 placed-point/movable-template 两种 anchor，本定义用 10 ft 可移动模板表示，施法者移动后需由 DM 手动拖动模板跟随",
      "「光环区域进入生物所在空间」由模板移动触发，ActiveAuras enter 事件只从 token 移动检测；模板拖过目标时的感知豁免由 DM 补掷",
      "2024 允许在持续时间内以附赠动作执行撤离（Disengage）；DSL 只有 dash 操作、没有 Disengage/额外动作原语，由玩家/DM 手动宣告",
      "「你可见的生物」只进入 interaction projection，不做自动视线/遮蔽校验；DM 应只为可见目标结算",
      "升环只按每高环 +1d8 自动扩骰，不额外增加触发次数或其他效果",
    ],
  },
  fragments: [
    graphFragment({
      id: "conjure-woodland-beings-graph",
      actions: [
        publicAction("cast", "咒唤林地卫士 Conjure Woodland Beings"),
      ],
      artifacts: [
        artifact({
          id: "conjure-woodland-beings-aura",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "movable-template",
            shape: { type: "radius", size: 10, units: "ft" },
            stationary: false,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("conjure-woodland-beings-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Conjure Woodland Beings Area",
          markerOnly: true,
          lifecycle: whileArtifact("conjure-woodland-beings-aura"),
        }),
      ],
      rules: [
        rule({
          id: "cast-conjure-woodland-beings",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "radius",
              size: 10,
              range: null,
              rangeUnits: "self",
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-aura",
              artifactId: "conjure-woodland-beings-aura",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "woodland-aura-entry-pulse",
          on: trigger("enter", {
            zoneId: "conjure-woodland-beings-aura",
          }),
          when: [auraPulse()],
          targets: [
            eventTarget("target:entry", [
              predicate("visible-to-source"),
            ]),
          ],
          do: [
            operation("saving-throw", {
              id: "entry-save",
              ability: ["wis"],
              target: "target:entry",
              onSave: "half",
            }),
            operation("damage", {
              id: "entry-damage",
              target: "target:entry",
              formula: woodlandDamage,
              damageTypes: ["force"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "woodland-aura-turn-end-pulse",
          on: trigger("turn-end", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "conjure-woodland-beings-membership",
              subject: "effect-target",
            }),
            auraPulse(),
          ],
          targets: [
            eventTarget("target:turn-end", [
              predicate("visible-to-source"),
            ]),
          ],
          do: [
            operation("saving-throw", {
              id: "turn-end-save",
              ability: ["wis"],
              target: "target:turn-end",
              onSave: "half",
            }),
            operation("damage", {
              id: "turn-end-damage",
              target: "target:turn-end",
              formula: woodlandDamage,
              damageTypes: ["force"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "self cast 只消耗一个四环或更高法术位并建立最长十分钟专注；以 10 ft 可移动模板表示光环，DM 负责拖动跟随施法者",
    "一名可见生物首次进入光环或在光环内结束回合时进行 Wisdom save，失败受到 5d8 force damage，成功只受一半",
    "进入与回合结束共用同一来源、目标与回合的去重 receipt，一名生物一回合最多结算一次",
    "每比四环高一环，光环伤害增加 1d8，触发次数与其他效果不变",
    "模板被拖入生物空间（5R 的光环进入生物空间）不产生 enter 事件，由 DM 补掷",
    "附赠动作撤离没有 Disengage 原语，由玩家/DM 手动执行；可见性与视线由 DM 确认",
    "专注结束、替换或到期时按本次 cast provenance 清理光环模板与成员 marker",
  ], { status: "compiler-passed" }),
});

export default conjureWoodlandBeings;
