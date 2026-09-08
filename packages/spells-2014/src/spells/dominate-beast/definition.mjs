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

const dominateBeast = cleanRoomSpell({
  id: "dominate-beast",
  contract: spellContract({
    ruleset: "2014",
    level: 4,
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
      "目标必须是施法者可见的 beast；当前 creature-type/visible predicates 只表达目标契约，由 DM 按现行声明输入政策在施法前确认资格",
      "施法者或其友方正在与目标交战时，首次 Wisdom save 应具有优势；该交战关系与豁免优势由 DM 处理",
      "自动持续时间固定为一分钟；五环为十分钟、六环为一小时、七环或更高为八小时的持续时间由 DM 手动延长来源专注及其 dependent 效果",
      "同位面心灵链接中的命令、目标执行命令，以及施法者用动作取得精确控制并用自身反应迫使目标反应，均由 DM 执行",
    ],
  },
  fragments: [
    graphFragment({
      id: "dominate-beast-graph",
      actions: [publicAction("cast", "支配野兽 Dominate Beast")],
      artifacts: [
        cleanRoomEffect("dominate-beast", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Dominate Beast",
          modifiers: [grantStatus("charmed")],
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-dominate-beast",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 60,
              kind: "creature",
              predicates: [
                predicate("creature-type", { value: "beast" }),
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
              id: "apply-dominate-beast",
              artifactId: "dominate-beast",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "repeat-save-after-damage",
          on: trigger("damage-taken", { subject: "effect-target" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "dominate-beast",
              subject: "effect-target",
            }),
            predicate("damage-applied", { minimum: 1 }),
          ],
          targets: [eventTarget("target:damaged")],
          do: [
            operation("saving-throw", {
              id: "damage-repeat-save",
              ability: ["wis"],
              target: "target:damaged",
              onSave: "none",
              rollMode: "normal",
            }),
          ],
        }),
        rule({
          id: "damage-repeat-save-succeeded",
          on: trigger("operation-outcome", {
            operationId: "damage-repeat-save",
            outcome: "success",
          }),
          targets: [eventTarget("target:released")],
          do: [
            operation("delete-artifact", {
              id: "remove-dominate-beast",
              artifactId: "dominate-beast",
              target: "target:released",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 对 60 ft 内一个由 DM 明确声明为施法者可见的 beast 进行首次 Wisdom save，并只消耗一个四环或更高法术位",
    "首次豁免失败的目标获得具有独立 source-target identity 的 charmed 效果；成功目标与未声明目标不改变；首次全数成功时，施法者立即通过受信 Effect UI 结束仍可主动维持的专注（明确 HITL）",
    "受影响目标每次承受至少 1 点实际伤害后进行一次不消耗法术位的普通 Wisdom save；零实际伤害不触发，同一伤害 workflow 对同一来源效果只触发一次",
    "受伤重复豁免成功时只删除本次来源的 Dominate Beast 效果，并在最后一个 dependent 消失时结束对应来源专注；其他施法来源不变",
    "自动化建立并维护最长一分钟的专注，专注结束时清理仍存在的目标效果；更高环位的规则时长由 DM 按 omission 手动延长",
    "自动化不推断目标资格或交战优势，也不执行命令、精确控制和反应控制",
  ], { status: "compiler-runtime-passed" }),
});

export default dominateBeast;
