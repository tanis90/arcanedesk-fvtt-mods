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
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 A 桶 desc-diff-flag）：删去金属护甲攻击优势，并把
// 「不能执行任何反应」改为「不能执行借机攻击」；1d8 闪电与戏法强化不变。
// 5R 锚点：5R 玩家手册2024 0环.htm#Shocking_Grasp。
const shockingGrasp = cleanRoomSpell({
  id: "shocking-grasp",
  contract: spellContract({
    ruleset: "2024",
    level: 0,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "2024 只禁止借机攻击；现有 block-action-kinds 只能按 reaction 整类阻断，故目标在到期前所有 reaction 都被阻断，比 5R 略宽（不新增 opportunity-attack kind）",
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
          name: "Shocking Grasp: No Opportunity Attacks",
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
          id: "apply-shocking-grasp-on-hit",
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
  accepted: acceptance(QA_LOG, [
    "触碰范围内一个声明目标进行 melee spell attack，戏法不消耗法术位",
    "命中造成 1d8 lightning damage，角色 5、11、17 级分别增至 2d8、3d8、4d8；暴击扩骰交给 Midi",
    "命中目标在下一回合开始前不能执行借机攻击（以 reaction 整类阻断实现，见 omission）",
    "2024 起金属护甲不再提供攻击优势，未命中也不创建效果",
    "非目标不变；同一来源重施 replace 而不叠加",
  ], { status: "compiler-passed" }),
});

export default shockingGrasp;
