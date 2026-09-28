import {
  QA_LOG,
  acceptance,
  allAttackRolls,
  cantripProgression,
  cleanRoomEffect,
  cleanRoomSpell,
  dice,
  duration,
  eventTarget,
  firstOf,
  gainAttackDisadvantage,
  graphFragment,
  instant,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  untilTrigger,
} from "../dsl.mjs";

const viciousMockery = cleanRoomSpell({
  id: "vicious-mockery",
  contract: spellContract({
    ruleset: "2014",
    level: 0,
    school: "enc",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标是否能看见施法者、能否听见咒骂仍由 DM 在声明目标时判断",
    ],
  },
  fragments: [
    graphFragment({
      id: "vicious-mockery-graph",
      actions: [publicAction("cast", "恶言相加 Vicious Mockery")],
      artifacts: [
        cleanRoomEffect("vicious-mockery", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Vicious Mockery",
          modifiers: [
            gainAttackDisadvantage(allAttackRolls()),
          ],
          lifecycle: firstOf(
            duration(1, "rounds"),
            untilTrigger(
              trigger("attack-roll-made", { subject: "effect-target" }),
            ),
            untilTrigger(trigger("turn-end", { subject: "effect-target" })),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-vicious-mockery",
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
            operation("saving-throw", {
              id: "cast:save",
              ability: ["wis"],
              target: "target:cast",
              onSave: "none",
            }),
            operation("damage", {
              id: "cast:damage",
              target: "target:cast",
              formula: cantripProgression(
                dice(1, 4),
                dice(1, 4),
              ),
              damageTypes: ["psychic"],
            }),
          ],
        }),
        rule({
          id: "apply-vicious-mockery-on-failed-save",
          on: trigger("operation-outcome", {
            operationId: "cast:save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "failure:apply-vicious-mockery",
              artifactId: "vicious-mockery",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    QA_LOG,
    [
      "60 ft 内一个声明目标进行 Wisdom save，且作为戏法不消耗法术位",
      "失败造成 1d4 psychic damage，并在角色 5、11、17 级分别增加至 2d4、3d4、4d4；成功不受伤害",
      "只有失败目标获得 Vicious Mockery effect，其下一次 attack roll 具有劣势",
      "该目标下一次 attack roll 完成后立即消费效果；若未攻击，效果最迟在其下一回合结束时移除",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default viciousMockery;
