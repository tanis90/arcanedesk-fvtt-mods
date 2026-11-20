import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  duration,
  eventTarget,
  grantSkillCheckBonus,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（2024，M1 审计 A 桶 desc-diff-flag）：失败效应由「察觉检定劣势」改为
// 察觉检定与被动察觉 -10；战斗中目标豁免由优势改为自动成功；持续时间改为专注。
// 来源：5R 玩家手册2024 2环.htm#Enthrall。
const enthrall = cleanRoomSpell({
  id: "enthrall",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "被动察觉的 -10 没有独立的被动值原语，当前只对 Perception checks 施加 -10；被动察觉由 DM 手动扣减",
      "与施法者或其同伴交战时目标自动成功于豁免；系统不探测战斗关系，由 DM 在声明目标前排除",
      "目标是否能听见施法者，以及施法者 incapacitated / 无法说话时的提前结束，当前没有可监听的听觉与状态条件；DM 在发生这些条件时移除 marker",
    ],
  },
  fragments: [
    graphFragment({
      id: "enthrall-graph",
      actions: [publicAction("cast", "注目术 Enthrall")],
      artifacts: [
        cleanRoomEffect("enthralled", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Enthrall",
          modifiers: [grantSkillCheckBonus("prc", constant(-10))],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-enthrall",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: "any",
              range: 60,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["wis"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "initial-save-failed",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "apply-enthralled",
              artifactId: "enthralled",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "一次施法只消耗一个二环或更高环位，并对 60 ft 内由 DM 确认可见的声明目标分别请求 Wisdom save",
    "只有首次豁免失败者获得独立 source-target identity 的 Enthrall effect；成功者与非目标不变",
    "效果期间对目标的 Perception checks 施加 -10；被动察觉 -10 保留为 DM omission",
    "效果最长持续一分钟并建立专注；专注结束时精确清理，不删除其他来源的同名效果",
    "2024 起回避战斗中豁免优势，改为与施法者或其同伴交战时自动成功，由 DM 在声明目标前排除",
  ], { status: "compiler-passed" }),
});

export default enthrall;
