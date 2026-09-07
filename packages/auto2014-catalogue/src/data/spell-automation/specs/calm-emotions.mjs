import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
  duration,
  eventTarget,
  firstOf,
  graphFragment,
  operation,
  placedTemplate,
  predicate,
  publicAction,
  requiredEnumSelection,
  rule,
  spellContract,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "../dsl.mjs";

const calmEmotions = cleanRoomSpell({
  id: "calm-emotions",
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
  content: contentRef("calm-emotions"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "2014 规则允许每个豁免失败的目标分别选择效果；当前由 DM 在施法前明确声明一个 effectMode，并将同一模式应用于本次施法的全部失败目标",
      "生物可以自愿放弃 Charisma save；当前由 DM 裁定，不增加逐目标的自动失败输入",
      "indifferent 模式不修改 Foundry token disposition；具体冷漠对象、目睹朋友受伤以及非攻击型有害法术造成的提前结束仍由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "calm-emotions-graph",
      actions: [
        publicAction("cast", "安定心神 Calm Emotions", {
          parameters: [
            requiredEnumSelection(
              "effectMode",
              ["suppress", "indifferent"],
              {
                labels: {
                  suppress: "压制魅惑/恐慌 Suppress Charmed/Frightened",
                  indifferent: "停止敌对 Indifferent",
                },
              },
            ),
          ],
        }),
      ],
      artifacts: [
        cleanRoomEffect("calm-emotions-suppression", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Calm Emotions: Suppression",
          img: "systems/dnd5e/icons/svg/statuses/marked.svg",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("calm-emotions-indifference", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Calm Emotions: Indifferent",
          img: "systems/dnd5e/icons/svg/statuses/marked.svg",
          markerOnly: true,
          modifiers: [],
          lifecycle: firstOf(
            whileSpellActive(),
            untilTrigger(
              trigger("attack-targeted", { subject: "effect-target" }),
            ),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-calm-emotions",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "sphere",
              size: 20,
              range: 60,
              kind: "humanoid",
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["cha"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "initial-save-failed-suppression",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          when: [
            predicate("input-selection-equals", {
              id: "effectMode",
              value: "suppress",
            }),
          ],
          targets: [eventTarget("target:suppression-failed")],
          do: [
            operation("apply-artifact", {
              id: "apply-calm-emotions-suppression",
              artifactId: "calm-emotions-suppression",
              target: "target:suppression-failed",
            }),
            operation("suppress-statuses", {
              id: "suppress-charmed-and-frightened-effects",
              target: "target:suppression-failed",
              statuses: ["charmed", "frightened"],
            }),
          ],
        }),
        rule({
          id: "initial-save-failed-indifference",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          when: [
            predicate("input-selection-equals", {
              id: "effectMode",
              value: "indifferent",
            }),
          ],
          targets: [eventTarget("target:indifference-failed")],
          do: [
            operation("apply-artifact", {
              id: "apply-calm-emotions-indifference",
              artifactId: "calm-emotions-indifference",
              target: "target:indifference-failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "battle-context 只暴露一个 placed-template 公共 action，并要求 DM 明确提供 suppress 或 indifferent；缺失、非法或旧枚举值 selection 在创建模板和消耗资源前以 INPUT_INVALID 拒绝，旧 actionId 另以 ACTION_NOT_FOUND 拒绝",
    "可信画布点击在 60 ft 内建立 20 ft radius sphere；只有模板内 humanoid 进行 Charisma save，成功者、非 humanoid 与区域外 token 均不改变",
    "suppress 模式只对失败目标暂停当前造成 charmed 或 frightened 的 ActiveEffect，保留原 Effect identity、机械和持续时间；不影响无关状态，也不阻止施法后新出现的魅惑或恐慌",
    "专注结束时，仍存在且未到期的原 Effect 在 suppression 来源移除后恢复；压制期间已经结束的 Effect 不重建",
    "indifferent 模式只给失败目标建立来源绑定的可见 marker，不增加 status 或修改 token disposition；目标被攻击或专注结束时 marker 清理",
    "一次合法施法只消耗一个二环或更高法术位并建立最长一分钟的专注；同一模板内多个失败目标不会重复扣槽",
  ], { status: "compiler-runtime-passed" }),
});

export default calmEmotions;
