import {
  QA_LOG,
  acceptance,
  blockActionKinds,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  contentRef,
  duration,
  eventTarget,
  graphFragment,
  operation,
  perSlotAboveBase,
  placedTemplate,
  predicate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const confusionRadius = perSlotAboveBase(
  constant(10),
  constant(5),
);

const confusion = cleanRoomSpell({
  id: "confusion",
  contract: spellContract({
    ruleset: "2014",
    level: 4,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  content: contentRef("confusion"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "每个受影响目标回合开始时，DM 按 2014 行为表掷 d10：1 再掷 d8 决定方向并手动移动；2–6 不移动且不执行动作；7–8 随机选择一个可触及生物并执行一次真实近战攻击；9–10 正常行动",
      "runtime 不掷或解释行为表的 d10/d8，不按表结果动态限制移动或动作，也不自动选择攻击目标或近战攻击条目",
      "受影响目标的 reaction Activity 会从 combat-agent 可用列表移除，并由 execute-turn、use-action 与 Midi preflight 硬阻断；原生角色卡或 Midi 反应对话框仍可能显示该选项",
    ],
  },
  fragments: [
    graphFragment({
      id: "confusion-graph",
      actions: [publicAction("cast", "困惑术 Confusion")],
      artifacts: [
        cleanRoomEffect("confusion", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Confusion",
          modifiers: [blockActionKinds(["reaction"])],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-confusion",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "sphere",
              size: confusionRadius,
              range: 90,
              evaluation: "snapshot",
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
              id: "apply-confusion",
              artifactId: "confusion",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "repeat-save-at-turn-end",
          on: trigger("turn-end", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "confusion",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:confused")],
          do: [
            operation("saving-throw", {
              id: "repeat-save",
              ability: ["wis"],
              target: "target:confused",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "repeat-save-succeeded",
          on: trigger("operation-outcome", {
            operationId: "repeat-save",
            outcome: "success",
          }),
          targets: [eventTarget("target:released")],
          do: [
            operation("delete-artifact", {
              id: "remove-confusion",
              artifactId: "confusion",
              target: "target:released",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 在 90 ft 内放置一个半径 10 ft 的球形快照模板；以五环或更高环位施放时，每高一环半径增加 5 ft",
    "模板内 creature 进行一次来源施法 DC 的 Wisdom save；只有失败目标获得本次来源绑定的 Confusion Effect，一次施法只消耗一个四环或更高法术位并建立最长一分钟专注",
    "Confusion Effect 存续时，目标的 reaction Activity 从 combat-agent 可用列表移除，execute-turn、use-action 与 Midi workflow preflight 均硬拒绝执行；原生角色卡或 Midi 对话框仍可能显示反应选项",
    "每个受影响目标在自己的回合结束时进行一次不消耗法术位、使用来源施法 DC 的 Wisdom save；失败保留效果，成功只删除该目标上本次来源的 Confusion Effect",
    "专注解除、替换或到期时清理本次来源仍存在的全部 Confusion Effect；不同施法来源彼此隔离",
    "每个受影响目标回合开始时由 DM 执行完整 2014 d10 表：1 再掷 d8 并按方向手动移动，2–6 不移动且不执行动作，7–8 随机选择可触及生物并进行一次真实近战攻击，9–10 正常行动",
    "runtime 不掷或解释 d10/d8，不根据表结果限制移动或动作，也不自动选择随机目标、近战攻击或执行该攻击",
  ], { status: "compiler-runtime-passed" }),
});

export default confusion;
