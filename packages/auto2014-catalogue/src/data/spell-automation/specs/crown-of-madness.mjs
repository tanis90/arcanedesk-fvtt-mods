import {
  compilerAcceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  endSourceWhenLastDependentEnds,
  eventTarget,
  grantStatus,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const crownOfMadness = cleanRoomSpell({
  id: "crown-of-madness",
  contract: spellContract({
    ruleset: "2014",
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
      "目标必须是施法者可见的 humanoid；当前 creature-type/visible predicates 仅表达契约，CLI 尚不强制这些资格，由 DM 在声明目标时确认",
      "施法者每回合选择受控目标、目标在移动前使用动作进行近战攻击，以及没有合格攻击对象时正常行动均由 DM 执行",
      "施法者在后续回合必须使用动作维持法术的门槛未自动追踪；未维持时由 DM 结束专注或清理效果",
      "规则允许目标选择是否在自己的回合结束时尝试 Wisdom save；当前对受此负面效果影响的目标默认每回合自动尝试，若目标主动放弃则由 DM 忽略结果并维持效果",
      "扭曲铁冠等可见叙事表现不生成独立场景实体",
    ],
  },
  fragments: [
    graphFragment({
      id: "crown-of-madness-graph",
      actions: [publicAction("cast", "疯狂冠冕 Crown of Madness")],
      artifacts: [
        cleanRoomEffect("crown-of-madness", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Crown of Madness",
          modifiers: [grantStatus("charmed")],
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-crown-of-madness",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 120,
              kind: "creature",
              predicates: [
                predicate("creature-type", { value: "humanoid" }),
                predicate("visible-to-source"),
              ],
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
              id: "apply-crown-of-madness",
              artifactId: "crown-of-madness",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "repeat-save-at-turn-end",
          on: trigger("turn-end", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "crown-of-madness",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:crowned")],
          do: [
            operation("saving-throw", {
              id: "repeat-save",
              ability: ["wis"],
              target: "target:crowned",
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
              id: "remove-crown-of-madness",
              artifactId: "crown-of-madness",
              target: "target:released",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: compilerAcceptance(EXPANSION_BATCH, [
    "一个由 DM 确认为 humanoid 的 120 ft 内声明目标进行 Wisdom save，并只消耗一个二环或更高法术位",
    "只有首次豁免失败的目标获得来源绑定的 charmed Crown of Madness 效果；成功目标不改变",
    "受影响目标在自己的每个回合结束时默认免费重复 Wisdom save，成功时删除本次来源的效果并结束对应专注",
    "施法建立最长一分钟的专注；重复豁免成功、专注结束或固定持续时间结束时清理 charmed 效果",
    "自动化不擅自选择受控攻击目标，也不代替 DM 判定施法者是否花费动作维持法术",
  ]),
});

export default crownOfMadness;
