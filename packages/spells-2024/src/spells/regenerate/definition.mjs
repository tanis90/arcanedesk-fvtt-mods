import {
  QA_LOG,
  acceptance,
  add,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  dice,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/7环.htm#Regenerate。
// 自动化等级：即时 4d8+15 治疗 + 一小时来源标记；每回合 1 点回血与 2 分钟断肢再生由 DM 执行。
const regenerate = cleanRoomSpell({
  id: "regenerate",
  contract: spellContract({
    ruleset: "2024",
    level: 7,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "「持续时间内目标在其每回合开始时恢复 1 点生命值」没有可落地的 healing-over-time adapter（编译器只把 turn-start/turn-end 伤害降级为 midi-overtime），由 DM 在目标回合开始时手动回血",
      "失去的身体部位在 2 分钟后重新长出属于部位/断肢状态，系统不追踪 body-part 状态，也不在 2 分钟节点自动恢复；由 DM 在持续期间说明",
      "目标是否愿意被触碰由 DM 在声明目标时确认；selected-targets 不校验目标自愿性",
      "一小时到期按法术生命周期清理 marker；DM 提前结束时手动删除 Regenerate effect",
    ],
  },
  fragments: [
    graphFragment({
      id: "regenerate-graph",
      actions: [publicAction("cast", "再生术 Regenerate", { activationType: "minute" })],
      artifacts: [
        cleanRoomEffect("regenerate", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Regenerate",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-regenerate",
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
            consume(),
            operation("healing", {
              id: "cast:healing",
              target: "target:cast",
              formula: add(dice(4, 8), constant(15)),
              healingTypes: ["healing"],
            }),
            operation("apply-artifact", {
              id: "cast:apply-regenerate",
              artifactId: "regenerate",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "1 分钟施法触碰一个声明 creature，只消耗一个七环或更高法术位，并立即恢复 4d8 + 15 点生命值",
    "目标获得持续一小时、不建立专注的 Regenerate 来源标记；同一来源对同一目标重施时 replace，不叠加",
    "每回合开始恢复 1 点生命值没有 healing-over-time 落地路径，保持明确 DM omission，不伪造自动回血",
    "失去的身体部位在 2 分钟后长回由 DM 说明，系统不追踪 body-part 状态",
    "非目标 HP 不变；一小时到期或 DM 手动删除 marker 时不改变目标 HP",
  ], { status: "compiler-passed" }),
});

export default regenerate;
