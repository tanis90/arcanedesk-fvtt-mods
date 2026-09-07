import {
  compilerAcceptance,
  add,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  levelsAboveBase,
  operation,
  pairwiseWithinDistance,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const charmPerson = cleanRoomSpell({
  id: "charm-person",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "enc",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标必须是施法者可见的 humanoid；当前 creature-type/visible predicates 仅表达契约，CLI 尚不强制这些资格，由 DM 在声明目标时确认",
      "施法者或其同伴正在与目标战斗时 Wisdom save 应具有优势；当前世界状态不足以可靠判断这段关系，由 DM 裁定该次豁免",
      "施法者或其同伴伤害目标时效果应提前结束；当前缺少可靠的来源阵营伤害生命周期，由 DM 清理对应效果",
      "目标将施法者视为友好熟人以及效果结束后知道自己被魅惑的社交结果由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "charm-person-graph",
      actions: [publicAction("cast", "魅惑人类 Charm Person")],
      artifacts: [
        cleanRoomEffect("charm-person", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Charm Person",
          modifiers: [grantStatus("charmed")],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-charm-person",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: add(constant(1), levelsAboveBase()),
              range: 30,
              kind: "creature",
              predicates: [
                predicate("creature-type", { value: "humanoid" }),
                predicate("visible-to-source"),
                pairwiseWithinDistance(30),
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
              id: "apply-charm-person",
              artifactId: "charm-person",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: compilerAcceptance(EXPANSION_BATCH, [
    "一环对一个由 DM 确认为 humanoid 的 30 ft 内声明目标进行 Wisdom save，每升一环可多声明一个目标",
    "升环声明多个目标时，CLI 通过 Foundry 距离 API 强制所有目标彼此在 30 ft 内",
    "只有首次豁免失败的目标获得来源绑定的 charmed 效果；成功目标和未声明目标不改变",
    "一次合法施法只消耗一个所声明环位的法术位，多个目标不会重复扣槽",
    "效果最长持续一小时，固定持续时间结束或显式清理时只移除本次来源的 Charm Person 效果",
    "自动化不推断敌对关系、豁免优势、伤害提前结束或魅惑后的社交行为",
  ]),
});

export default charmPerson;
