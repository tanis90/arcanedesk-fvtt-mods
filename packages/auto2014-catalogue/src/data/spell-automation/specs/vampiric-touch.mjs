import {
  acceptance,
  actualDamage,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  contentRef,
  dice,
  duration,
  graphFragment,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  requiresSourceArtifact,
  rule,
  selected,
  self,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const vampiricTouch = cleanRoomSpell({
  id: "vampiric-touch",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  content: contentRef("vampiric-touch"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "治疗按 Midi 实际结算的暗蚀伤害计算，过量治疗自然封顶",
      "攻击目标为物件或其他非生物目标时由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "vampiric-touch-graph",
      actions: [
        publicAction("cast", "吸血鬼之触 Vampiric Touch"),
        publicAction("touch", "吸血鬼之触：触击 Vampiric Touch Strike", {
          activationType: "action",
          availableWhen: [requiresSourceArtifact("vampiric-touch-source")],
        }),
      ],
      artifacts: [
        cleanRoomEffect("vampiric-touch-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Vampiric Touch",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-vampiric-touch",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 5,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-source",
              artifactId: "vampiric-touch-source",
              target: "source",
            }),
            operation("attack-roll", {
              id: "cast:attack",
              target: "target:cast",
              attack: {
                source: "spellcasting",
                range: "melee",
              },
            }),
            operation("damage", {
              id: "cast:damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(3, 6),
                dice(1, 6),
              ),
              damageTypes: ["necrotic"],
            }),
          ],
        }),
        rule({
          id: "vampiric-heal-source",
          on: trigger("operation-outcome", {
            operationId: "cast:attack",
            outcome: "hit",
          }),
          targets: [self("target:source")],
          do: [
            operation("healing", {
              id: "heal:source",
              target: "target:source",
              formula: actualDamage(),
              healingFraction: constant(0.5),
              healingTypes: ["healing"],
            }),
          ],
        }),
        rule({
          id: "touch-vampiric-touch",
          on: trigger("action-used", { actionId: "touch" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "vampiric-touch-source",
              subject: "source",
            }),
          ],
          targets: [
            selected("target:touch", {
              min: 1,
              max: 1,
              range: 5,
              kind: "creature",
            }),
          ],
          do: [
            operation("attack-roll", {
              id: "touch:attack",
              target: "target:touch",
              attack: {
                source: "spellcasting",
                range: "melee",
              },
            }),
            operation("damage", {
              id: "touch:damage",
              target: "target:touch",
              formula: perSlotAboveBase(
                dice(3, 6),
                dice(1, 6),
              ),
              damageTypes: ["necrotic"],
            }),
          ],
        }),
        rule({
          id: "touch-vampiric-heal-source",
          on: trigger("operation-outcome", {
            operationId: "touch:attack",
            outcome: "hit",
          }),
          targets: [self("target:source")],
          do: [
            operation("healing", {
              id: "touch:heal:source",
              target: "target:source",
              formula: actualDamage(),
              healingFraction: constant(0.5),
              healingTypes: ["healing"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    EXPANSION_BATCH,
    [
      "cast 是 action，对 5 ft 触及内一个声明生物目标进行 melee spell attack，只消耗一个三环或更高法术位，并建立一分钟专注与 vampiric-touch-source marker",
      "cast 的原生 attack activity 在命中时造成 3d6 necrotic damage，暴击骰由 Midi 处理，并按 Midi 实际结算的暗蚀伤害一半（向下取整）治疗施法者；未命中不造成伤害也不治疗",
      "每升一环伤害增加 1d6，治疗量始终按实际结算伤害的一半计算",
      "touch 是独立原生 attack action，仅在 vampiric-touch-source 存在时可见可用，不消耗法术位，每次可自由选择 5 ft 触及内一个生物目标，其攻击、伤害、暴击与治疗机械与 cast 完全相同",
      "专注结束或 source marker 被移除后 touch 不再可用",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default vampiricTouch;
