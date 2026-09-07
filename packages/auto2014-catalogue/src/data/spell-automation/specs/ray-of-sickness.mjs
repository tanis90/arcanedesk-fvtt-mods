import {
  compilerAcceptance,
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
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const rayOfSickness = cleanRoomSpell({
  id: "ray-of-sickness",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: { level: "full", omissions: [] },
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
          id: "save-after-ray-hit",
          on: trigger("operation-outcome", {
            operationId: "cast:attack",
            outcome: "hit",
          }),
          targets: [eventTarget("target:hit")],
          do: [
            operation("saving-throw", {
              id: "hit:save",
              ability: ["con"],
              target: "target:hit",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "apply-poisoned-after-failed-save",
          on: trigger("operation-outcome", {
            operationId: "hit:save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "failure:apply-poisoned",
              artifactId: "ray-of-sickness-poisoned",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: compilerAcceptance(EXPANSION_BATCH, [
    "60 ft 内一个声明目标进行 ranged spell attack，并只消耗一个所声明环位的法术位",
    "命中造成 2d8 poison damage，每升一环增加 1d8；暴击扩骰交给 Midi；未命中不造成伤害也不进行 Constitution save",
    "命中后目标进行一次 Constitution save；成功时只有命中伤害，失败时额外获得来源绑定的 poisoned 状态",
    "poisoned 精确持续到施法者下一回合结束；在此之前不会因目标自己的回合开始或结束而提前移除",
    "同一来源重施时 replace 并刷新到期点，不叠加重复状态；不同来源的效果按 source-target identity 隔离",
  ]),
});

export default rayOfSickness;
