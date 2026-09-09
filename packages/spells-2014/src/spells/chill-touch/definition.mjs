import {
  QA_LOG,
  acceptance,
  blockHealing,
  cantripProgression,
  cleanRoomEffect,
  cleanRoomSpell,
  dice,
  duration,
  eventTarget,
  firstOf,
  graphFragment,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  untilTrigger,
} from "@arcanedesk/spell-compiler/dsl";

const chillTouch = cleanRoomSpell({
  id: "chill-touch",
  contract: spellContract({
    ruleset: "2014",
    level: 0,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "rounds")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "命中 undead 后，其对施法者的攻击检定具有劣势直到施法者下一回合结束；现有攻击劣势 selector 只能覆盖目标的全部攻击，不能安全限定为只攻击本次施法者",
    ],
  },
  fragments: [
    graphFragment({
      id: "chill-touch-graph",
      actions: [publicAction("cast", "颤栗之触 Chill Touch")],
      artifacts: [
        cleanRoomEffect("chill-touch-blocked-healing", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Chill Touch: Blocked Healing",
          modifiers: [blockHealing()],
          lifecycle: firstOf(
            duration(1, "rounds"),
            untilTrigger(trigger("turn-start", { subject: "source" })),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-chill-touch",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 120,
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
              damageTypes: ["necrotic"],
            }),
          ],
        }),
        rule({
          id: "apply-chill-touch-blocked-healing-on-hit",
          on: trigger("operation-outcome", {
            operationId: "cast:attack",
            outcome: "hit",
          }),
          targets: [eventTarget("target:hit")],
          do: [
            operation("apply-artifact", {
              id: "hit:apply-blocked-healing",
              artifactId: "chill-touch-blocked-healing",
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
      "120 ft 内一个声明目标进行 ranged spell attack，且作为戏法不消耗法术位",
      "命中造成 1d8 necrotic damage，并在角色 5、11、17 级分别增加至 2d8、3d8、4d8；暴击扩骰交给 Midi",
      "未命中不造成伤害，也不创建 Chill Touch: Blocked Healing effect",
      "命中目标不能恢复 HP，直到施法者下一回合开始；一轮时长作为非战斗或异常回合顺序的上限",
      "undead 对施法者的定向攻击劣势明确保留给 DM，不扩大成对全部目标的攻击劣势",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default chillTouch;
