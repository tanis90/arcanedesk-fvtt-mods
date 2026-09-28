import {
  QA_LOG,
  acceptance,
  cantripProgression,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  decreaseAllMovement,
  dice,
  duration,
  eventTarget,
  firstOf,
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

const rayOfFrost = cleanRoomSpell({
  id: "ray-of-frost",
  contract: spellContract({
    ruleset: "2014",
    level: 0,
    school: "evo",
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
      id: "ray-of-frost-graph",
      actions: [publicAction("cast", "冷冻射线 Ray of Frost")],
      artifacts: [
        cleanRoomEffect("ray-of-frost-slowed", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Ray of Frost: Slowed",
          modifiers: [
            decreaseAllMovement(constant(10)),
          ],
          lifecycle: firstOf(
            duration(1, "rounds"),
            untilTrigger(trigger("turn-start", { subject: "source" })),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-ray-of-frost",
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
              formula: cantripProgression(
                dice(1, 8),
                dice(1, 8),
              ),
              damageTypes: ["cold"],
            }),
          ],
        }),
        rule({
          id: "apply-ray-of-frost-slow-on-hit",
          on: trigger("operation-outcome", {
            operationId: "cast:attack",
            outcome: "hit",
          }),
          targets: [eventTarget("target:hit")],
          do: [
            operation("apply-artifact", {
              id: "hit:apply-ray-of-frost-slow",
              artifactId: "ray-of-frost-slowed",
              target: "target:hit",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    QA_LOG,
    [
      "60 ft 内一个声明目标进行 ranged spell attack，且作为戏法不消耗法术位",
      "命中造成 1d8 cold damage，并在角色 5、11、17 级分别增加至 2d8、3d8、4d8；暴击扩骰交给 Midi",
      "未命中不造成伤害，也不创建 Ray of Frost: Slowed effect",
      "命中后目标所有速度减少 10 ft，直到施法者下一回合开始；一轮时长作为非战斗或异常回合顺序的上限",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default rayOfFrost;
