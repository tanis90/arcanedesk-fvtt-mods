import {
  QA_LOG,
  acceptance,
  blockActionKinds,
  cantripProgression,
  cleanRoomEffect,
  cleanRoomSpell,
  dice,
  eventTarget,
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

const shockingGrasp = cleanRoomSpell({
  id: "shocking-grasp",
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
  support: {
    level: "simplified",
    omissions: [
      "目标穿戴金属制护甲时，本次 melee spell attack 应具有优势；现有目标与攻击原语没有封闭的穿戴护甲材质 predicate",
    ],
  },
  fragments: [
    graphFragment({
      id: "shocking-grasp-graph",
      actions: [publicAction("cast", "电爪 Shocking Grasp")],
      artifacts: [
        cleanRoomEffect("shocking-grasp-no-reactions", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Shocking Grasp: No Reactions",
          modifiers: [blockActionKinds(["reaction"])],
          lifecycle: untilTrigger(
            trigger("turn-start", { subject: "effect-target" }),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-shocking-grasp",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
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
              formula: cantripProgression(
                dice(1, 8),
                dice(1, 8),
              ),
              damageTypes: ["lightning"],
            }),
          ],
        }),
        rule({
          id: "apply-shocking-grasp-no-reactions-on-hit",
          on: trigger("operation-outcome", {
            operationId: "cast:attack",
            outcome: "hit",
          }),
          targets: [eventTarget("target:hit")],
          do: [
            operation("apply-artifact", {
              id: "hit:apply-no-reactions",
              artifactId: "shocking-grasp-no-reactions",
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
      "5 ft 内一个声明目标进行 melee spell attack，且作为戏法不消耗法术位",
      "命中造成 1d8 lightning damage，并在角色 5、11、17 级分别增加至 2d8、3d8、4d8；暴击扩骰交给 Midi",
      "只有命中目标获得 Shocking Grasp: No Reactions effect，且不能采取 reaction 直到其下一回合开始",
      "未命中不造成伤害，也不创建 no-reactions effect",
      "金属护甲提供的本次攻击优势明确保留给 DM，不给全部目标无条件优势",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default shockingGrasp;
