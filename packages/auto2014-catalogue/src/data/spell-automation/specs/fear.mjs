import {
  compilerAcceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const fear = cleanRoomSpell({
  id: "fear",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "ill",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "首次豁免失败时丢下手持物件需要安全的 actor-owned item 状态变更与恢复政策；当前由 DM 执行",
      "受影响目标每回合必须 Dash 并沿最安全路线远离施法者的行为涉及路径选择与行动自治，当前只应用 frightened 状态并由 DM 移动目标",
      "目标只能在回合结束且已无法看见施法者时重复 Wisdom save；当前 DSL 只有正向 can-see-source predicate，没有 cannot-see-source，因此不自动请求重复豁免，DM 在满足条件且豁免成功后移除效果",
    ],
  },
  fragments: [
    graphFragment({
      id: "fear-graph",
      actions: [publicAction("cast", "恐惧术 Fear")],
      artifacts: [
        cleanRoomEffect("fear", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Fear",
          modifiers: [grantStatus("frightened")],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-fear",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cone",
              size: 30,
              range: null,
              rangeUnits: "self",
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
              id: "apply-fear",
              artifactId: "fear",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: compilerAcceptance(EXPANSION_BATCH, [
    "DM 从施法者位置确定一个 30-ft cone，并由同一 workflow 快照模板内 creature",
    "模板成员分别进行 Wisdom save；只有失败者获得 source-target scoped frightened，成功者与非目标不变",
    "成功施法只消耗一个三环或更高环位并建立最长一分钟的专注；解除或替换专注会清理全部本来源 Fear 效果",
    "锥形模板仅用于本次 workflow 的目标快照；结算后先解除 dnd5e dependent 关系再删除模板，不能因此结束专注",
    "丢下手持物、Dash 与逃跑路径，以及失去施法者视线后的条件式重复豁免保持明确 omission，不伪造无条件回合末豁免",
  ]),
});

export default fear;
