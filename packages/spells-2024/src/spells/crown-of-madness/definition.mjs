import {
  QA_LOG,
  acceptance,
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
} from "@arcanedesk/spell-compiler/dsl";

// L4 移植批（非 SRD，spells24 无源文档）：G 桶 + 2014 recipe crown-of-madness。
// 5R 锚点 二环.htm#Crown_of_Madness。与 2014 差异：不再限类人（改为非类人自动通过豁免）、施法者每回合需用魔法动作维持控制；豁免/魅惑/重复豁免机制一致。
const crownOfMadness = cleanRoomSpell({
  id: "crown-of-madness",
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
      "目标必须是施法者可见的生物；当前 visible-to-source predicate 仅表达契约，CLI 尚不强制可见性，由 DM 在声明目标时确认",
      "5R 规定非类人生物自动通过感知豁免；runtime 不按 creature type 自动改判，DM 需在结算前把非类人目标移出目标列表",
      "施法者每自己回合必须用一个魔法动作维持对目标的控制，否则法术终止；魔法动作消耗与终止时机由 DM 追踪",
      "施法者每回合精神性选择受控攻击目标、目标在移动前使用动作进行近战攻击，以及没有合格攻击对象时正常行动均由 DM 执行",
      "规则允许目标选择是否在自己的回合结束时尝试感知豁免；当前对受此负面效果影响的目标默认每回合自动尝试，若目标主动放弃则由 DM 忽略结果并维持效果",
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
  accepted: acceptance(QA_LOG, [
    "一个 120 ft 内声明目标进行 Wisdom save，并只消耗一个二环或更高法术位",
    "只有首次豁免失败的目标获得来源绑定的 charmed Crown of Madness 效果；成功目标不改变",
    "受影响目标在自己的每个回合结束时默认免费重复 Wisdom save，成功时删除本次来源的效果并结束对应专注",
    "施法建立最长一分钟的专注；重复豁免成功、专注结束或固定持续时间结束时清理 charmed 效果",
    "自动化不擅自选择受控攻击目标，也不代替 DM 判定施法者是否花费魔法动作维持法术或目标是否为类人",
  ], { status: "compiler-runtime-passed" }),
});

export default crownOfMadness;
