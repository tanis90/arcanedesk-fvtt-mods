import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  consume,
  dice,
  eventNeighborhood,
  graphFragment,
  instant,
  operation,
  perSlotAboveBase,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

const explosionTargets =
  eventNeighborhood("target:explosion", {
    anchor: "target",
    radius: 5,
    units: "ft",
    includeAnchor: true,
    kind: "creature",
  });

const explosionRule =
  rule({
    id: "ice-knife-explosion",
    on: trigger("operation-complete", {
      operationId: "cast:attack",
    }),
    targets: [
      explosionTargets,
    ],
    do: [
      operation("saving-throw", {
        id: "explosion:save",
        ability: ["dex"],
        target: "target:explosion",
        onSave: "none",
      }),
      operation("damage", {
        id: "explosion:cold-damage",
        target: "target:explosion",
        formula: perSlotAboveBase(
          dice(2, 6),
          dice(1, 6),
        ),
        damageTypes: ["cold"],
        onSave: "none",
      }),
    ],
  });

const iceKnife = cleanRoomSpell({
  id: "ice-knife",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "con",
    components: {
      verbal: false,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "ice-knife-graph",
      actions: [
        publicAction("cast", "冰刃术 Ice Knife"),
      ],
      rules: [
        rule({
          id: "cast-ice-knife",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 60,
              kind: "creature",
            }),
          ],
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
              id: "cast:piercing-damage",
              target: "target:cast",
              formula: dice(1, 10),
              damageTypes: ["piercing"],
            }),
          ],
        }),
        explosionRule,
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "对 60 ft 内一个 creature 进行 ranged spell attack，并且一次施法只消耗一个明确声明环位的法术位",
    "命中时主要目标承受 1d10 piercing damage，未命中时不承受该伤害；这部分不随升环增加且暴击扩骰交给 Midi",
    "无论攻击命中或未命中，都以主要目标为圆心快照其自身及 5 ft 内所有 creature，并分别进行 Dexterity save",
    "爆炸豁免失败承受 2d6 cold damage，成功不受伤害；每升一环只给 cold damage 增加 1d6",
    "5 ft 外 creature 不进行爆炸豁免也不受 cold damage，同一次攻击 outcome 只触发一轮爆炸",
  ], { status: "compiler-runtime-passed" }),
});

export default iceKnife;
