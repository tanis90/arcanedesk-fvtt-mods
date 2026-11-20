import {
  QA_LOG,
  acceptance,
  blockHealing,
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

// L2 重写批（2024，M1 审计 C 桶 recipe-invalid）：120 ft 远程攻击 1d8 改为触碰近战法术攻击 1d10，
// 封禁治疗由「你下一回合开始」改为「下一回合结束」；删去 2014 的 undead 专属劣势。
// 来源：5R 玩家手册2024 0环.htm#Chill_Touch。
const chillTouch = cleanRoomSpell({
  id: "chill-touch",
  contract: spellContract({
    ruleset: "2024",
    level: 0,
    school: "nec",
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
      "封禁治疗只以 blockHealing modifier 表达；目标自身再生、天赋恢复等不经过普通治疗的恢复路径由 DM 处理",
      "「直到你下一回合结束」以施法者 turn-end next-after-created 脉冲为界；跨场景或回合顺序被手动篡改时的边界由 DM 裁定",
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
          id: "cast-chill-touch",
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
                dice(1, 10),
                dice(1, 10),
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
  accepted: acceptance(QA_LOG, [
    "touch 范围内一个声明目标进行 melee spell attack，且作为戏法不消耗法术位",
    "命中造成 1d10 necrotic damage，并在角色 5、11、17 级分别增加至 2d10、3d10、4d10；暴击扩骰交给 Midi",
    "未命中不造成伤害，也不创建 Chill Touch: Blocked Healing effect",
    "命中目标不能恢复 HP，直到施法者下一回合结束；effect 在施法者 turn-end 的 next-after-created 脉冲精确移除",
    "2024 不再有「undead 目标对你的攻击具有劣势」条款，因此不应用任何定向攻击劣势",
  ], { status: "compiler-passed" }),
});

export default chillTouch;
