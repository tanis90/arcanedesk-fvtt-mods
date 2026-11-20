import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  eventTarget,
  grantStatus,
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
  untilTrigger,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：2024 命中即中毒（持续到你下回合
// 结束），删除了 2014 命中后的体质豁免；伤害仍为 2d8 毒素、升环 +1d8。
// 5R 锚点：5R 玩家手册2024 1环.htm#Ray_of_Sickness。
const rayOfSickness = cleanRoomSpell({
  id: "ray-of-sickness",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "full",
    omissions: [],
  },
  fragments: [
    graphFragment({
      id: "ray-of-sickness-graph",
      actions: [publicAction("cast", "致病射线 Ray of Sickness")],
      artifacts: [
        cleanRoomEffect("ray-of-sickness-poisoned", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Ray of Sickness: Poisoned",
          modifiers: [grantStatus("poisoned")],
          lifecycle: untilTrigger(
            trigger("turn-end", {
              subject: "source",
              occurrence: "next-after-created",
            }),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-ray-of-sickness",
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
              id: "cast:damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(2, 8),
                dice(1, 8),
              ),
              damageTypes: ["poison"],
            }),
          ],
        }),
        rule({
          id: "apply-poisoned-on-hit",
          on: trigger("operation-outcome", {
            operationId: "cast:attack",
            outcome: "hit",
          }),
          targets: [eventTarget("target:hit")],
          do: [
            operation("apply-artifact", {
              id: "hit:apply-poisoned",
              artifactId: "ray-of-sickness-poisoned",
              target: "target:hit",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 对 60 ft 内一个 creature 进行远程法术攻击，只消耗一个一环或更高法术位",
    "命中造成 2d8 poison damage，每升一环增加 1d8；暴击扩骰交给 Midi；未命中不造成伤害也不施加中毒",
    "2024 命中即中毒，不再进行命中后的 Constitution save",
    "poisoned 持续到施法者下一回合结束；在此之前不会因目标自己的回合开始或结束而提前移除",
    "同一来源重施时 replace 并刷新到期点，不叠加重复状态；不同来源按 source-target identity 隔离",
  ], { status: "compiler-passed" }),
});

export default rayOfSickness;
