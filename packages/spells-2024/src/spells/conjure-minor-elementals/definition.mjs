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

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：不再召唤元素生物，改为自身 15 ft 光环内
// 攻击附伤 2d8 与困难地形。
// 5R 锚点：5R 玩家手册2024 4环.htm#Conjure_Minor_Elementals。
const minorElementalDamage = perSlotAboveBase(
  dice(2, 8),
  dice(1, 8),
);

const conjureMinorElementals = cleanRoomSpell({
  id: "conjure-minor-elementals",
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
      "5R 的光环跟随施法者；zone 原语只有 placed-point/movable-template 两种 anchor，本定义用 15 ft 可移动模板表示，施法者移动后需由 DM 手动拖动模板跟随",
      "额外伤害类型本应在每次发动攻击时从强酸/寒冷/火焰/闪电中选择；marked-target damage flag 只接受单一固定伤害类型，当前固定为 acid，DM 可在伤害卡上改为 cold/fire/lightning",
      "光环内的地面是困难地形，需要按实际穿越路径增加移动消耗；当前没有 zone movement-cost 原语，由 DM 处理",
      "光环成员判定由 ActiveAuras 只承诺 XY 几何；离地或不同 elevation 的目标由 DM 排除",
      "marked-target 附伤 flag 只携带基础 2d8 公式，不含升环 scaling：每高环 +1d8 由 DM 在伤害卡手动加骰",
    ],
  },
  fragments: [
    graphFragment({
      id: "conjure-minor-elementals-graph",
      actions: [
        publicAction("cast", "咒唤微元素群 Conjure Minor Elementals"),
      ],
      artifacts: [
        artifact({
          id: "conjure-minor-elementals-aura",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "movable-template",
            shape: { type: "radius", size: 15, units: "ft" },
            stationary: false,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("conjure-minor-elementals-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Conjure Minor Elementals Area",
          markerOnly: true,
          lifecycle: whileArtifact("conjure-minor-elementals-aura"),
        }),
      ],
      rules: [
        rule({
          id: "cast-conjure-minor-elementals",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "radius",
              size: 15,
              range: null,
              rangeUnits: "self",
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-aura",
              artifactId: "conjure-minor-elementals-aura",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "minor-elementals-attack-hit-rider",
          on: trigger("operation-outcome", {
            operationId: "external:source-attack",
            outcome: "hit",
          }),
          when: [
            predicate("attack-kind", { value: "attack" }),
            predicate("artifact-exists", {
              artifactId: "conjure-minor-elementals-membership",
              subject: "attack-target",
            }),
            predicate("artifact-source-matches", {
              artifactId: "conjure-minor-elementals-membership",
              subject: "attack-target",
              source: "source",
            }),
          ],
          targets: [eventTarget("target:hit")],
          do: [
            operation("damage", {
              id: "hit:minor-elementals-damage",
              target: "target:hit",
              formula: minorElementalDamage,
              damageTypes: ["acid"],
              attachment: "triggering-attack",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "self cast 只消耗一个四环或更高法术位并建立最长十分钟专注；以 15 ft 可移动模板表示光环，DM 负责拖动跟随施法者",
    "光环内成员的判定来自 ActiveAuras 模板成员关系，施法者攻击命中光环成员时追加 2d8 acid damage 到同一父伤害 roll",
    "额外伤害只附加在施法者本人的攻击命中上，未命中、光环外目标与其他来源的攻击均不触发",
    "暴击扩骰交给父伤害 workflow 与 midi-qol；升环 +1d8 未随 marked-target flag 传递，由 DM 手动加骰",
    "额外伤害类型当前固定为 acid；5R 的四选一类型由 DM 在伤害卡调整，属于已知 DSL 缺口",
    "光环内困难地形、随施法者移动与非 XY 高程成员关系由 DM 处理",
    "专注结束、替换或到期时按本次 cast provenance 清理光环模板与成员效果",
  ], { status: "compiler-passed" }),
});

export default conjureMinorElementals;
