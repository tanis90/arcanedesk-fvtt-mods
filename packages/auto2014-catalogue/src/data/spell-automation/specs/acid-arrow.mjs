import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  duration,
  eventTarget,
  graphFragment,
  instant,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  untilTrigger,
} from "../dsl.mjs";

const acidArrow = cleanRoomSpell({
  id: "acid-arrow",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 2 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "acid-arrow-graph",
      actions: [
        publicAction("cast", "马友夫强酸箭 Acid Arrow"),
      ],
      artifacts: [
        cleanRoomEffect("acid-arrow-delayed-damage", {
          host: "actor",
          scope: "source-target",
          reapply: "stack",
          name: "Acid Arrow: Delayed Damage",
          lifecycle: untilTrigger(
            trigger("turn-end", { subject: "effect-target" }),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-acid-arrow",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [selected("target:cast", { max: 1, range: 90 })],
          do: [
            consume(),
            operation("attack-roll", {
              id: "cast:attack",
              target: "target:cast",
              attack: {
                source: "spellcasting",
                range: "ranged",
              },
            }),
            operation("damage", {
              id: "cast:hit-damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(4, 4),
                dice(1, 4),
              ),
              damageTypes: ["acid"],
            }),
          ],
        }),
        rule({
          id: "acid-arrow-hit",
          on: trigger("operation-outcome", {
            operationId: "cast:attack",
            outcome: "hit",
          }),
          targets: [eventTarget("target:hit")],
          do: [
            operation("apply-artifact", {
              id: "hit:apply-delayed-acid",
              artifactId: "acid-arrow-delayed-damage",
              target: "target:hit",
            }),
          ],
        }),
        rule({
          id: "acid-arrow-miss",
          on: trigger("operation-outcome", {
            operationId: "cast:attack",
            outcome: "miss",
          }),
          targets: [eventTarget("target:miss")],
          do: [
            operation("damage", {
              id: "miss:half-initial-damage",
              target: "target:miss",
              formula: perSlotAboveBase(
                dice(4, 4),
                dice(1, 4),
              ),
              damageTypes: ["acid"],
              multiplier: 0.5,
              rounding: "down",
            }),
          ],
        }),
        rule({
          id: "acid-arrow-delayed-turn-end",
          on: trigger("turn-end", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "acid-arrow-delayed-damage",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:delayed")],
          do: [
            operation("damage", {
              id: "delayed:acid-damage",
              target: "target:delayed",
              formula: perSlotAboveBase(
                dice(2, 4),
                dice(1, 4),
              ),
              damageTypes: ["acid"],
            }),
            operation("delete-artifact", {
              id: "delayed:remove-marker",
              artifactId: "acid-arrow-delayed-damage",
              target: "target:delayed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "90 ft 内一个声明目标进行 ranged spell attack，并只消耗一个所声明环位的法术位",
      "命中造成 4d4 acid damage；每升一环增加 1d4，暴击扩骰交给 Midi",
      "每次命中建立一个独立延迟伤害 Effect，并在目标自己下一回合结束时造成 2d4 acid damage；每升一环增加 1d4",
      "延迟伤害结算后删除对应 Effect，不重复结算也不再次消耗法术位",
      "未命中只承受向下取整的一半初始伤害，不建立延迟 Effect，也没有下一回合结束伤害",
      "多支命中的 Acid Arrow 各自保留独立延迟实例，并在对应目标回合结束分别结算",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default acidArrow;
