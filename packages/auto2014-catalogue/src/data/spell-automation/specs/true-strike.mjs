import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  duration,
  endSourceWhenLastDependentEnds,
  firstOf,
  graphFragment,
  nextTurnAttackAdvantageAgainstMarkedTarget,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const trueStrike = cleanRoomSpell({
  id: "true-strike",
  contract: spellContract({
    ruleset: "2014",
    level: 0,
    school: "div",
    components: {
      verbal: false,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "rounds")),
  }),
  emission: { contentVersion: 1 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "true-strike-graph",
      actions: [publicAction("cast", "克敌先击 True Strike")],
      artifacts: [
        cleanRoomEffect("true-strike-target", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "True Strike",
          modifiers: [
            nextTurnAttackAdvantageAgainstMarkedTarget(),
          ],
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: firstOf(
            whileSpellActive(),
            untilTrigger(
              trigger("turn-end", {
                subject: "source",
                occurrence: "next-after-created",
              }),
            ),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-true-strike",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 30,
              kind: "creature",
            }),
          ],
          do: [
            operation("apply-artifact", {
              id: "cast:apply-true-strike",
              artifactId: "true-strike-target",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "action 对 30 ft 内一个声明生物建立 source-target 绑定的 True Strike marker，戏法不消耗法术位并建立最长一轮的专注",
    "施法当回合以及施法者下一回合以外的攻击均不获得优势，也不消费 marker",
    "施法者下一回合对被标记目标进行的第一次 attack roll 获得优势；武器与法术攻击均可满足条件",
    "该次符合条件的攻击无论命中或未命中都在 attack roll 完成后消费 marker，后续攻击不再获得优势；最后一个 marker 消失时来源专注同步结束",
    "其他攻击者或施法者攻击其他目标时既不获得优势也不消费 marker；不同来源对同一目标的 marker 保持隔离",
    "若没有进行符合条件的攻击，marker 在施法者下一回合结束时移除；解除或替换专注也会立即清理",
  ], { status: "compiler-runtime-passed" }),
});

export default trueStrike;
