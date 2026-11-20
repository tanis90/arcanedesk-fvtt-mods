import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  eventTarget,
  firstOf,
  grantStatus,
  graphFragment,
  operation,
  placedTemplate,
  predicate,
  publicAction,
  requiresSourceArtifact,
  rule,
  spellContract,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 A 桶 desc-diff-flag）：2024 删去亡灵与泥怪在该豁免上
// 的劣势；6d8 光耀 / 体质豁免半伤 / 目盲与再次发射不变。
// 5R 锚点：5R 玩家手册2024 6环.htm#Sunbeam。
const sunbeam = cleanRoomSpell({
  id: "sunbeam",
  contract: spellContract({
    ruleset: "2024",
    level: 6,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "施法者产生的 30 ft bright / 30 ft dim 光照、该光为阳光及其环境交互均由 DM 处理；本定义不创建光照 Artifact",
      "DM 保证后续每回合至多使用一次 Recast 并消耗该回合的魔法动作；source gate 只证明法术来源仍存续，不充当 action economy 状态机",
      "线状模板与目标之间的遮挡/掩体判定由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "sunbeam-graph",
      actions: [
        publicAction("cast", "阳炎射线 Sunbeam"),
        publicAction("recast", "阳炎射线：再次发射 Sunbeam: Recast", {
          availableWhen: [requiresSourceArtifact("sunbeam-source")],
        }),
      ],
      artifacts: [
        cleanRoomEffect("sunbeam-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Sunbeam",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("sunbeam-blinded", {
          host: "actor",
          scope: "source-target",
          reapply: "stack",
          name: "Sunbeam: Blinded",
          modifiers: [grantStatus("blinded")],
          lifecycle: firstOf(
            duration(1, "rounds"),
            untilTrigger(trigger("turn-start", { subject: "source" })),
            whileSpellActive(),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-sunbeam",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "line",
              size: 60,
              width: 5,
              range: null,
              rangeUnits: "self",
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-source",
              artifactId: "sunbeam-source",
              target: "source",
            }),
            operation("saving-throw", {
              id: "cast:save",
              ability: ["con"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "cast:damage",
              target: "target:cast",
              formula: dice(6, 8),
              damageTypes: ["radiant"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "cast-sunbeam-save-failed",
          on: trigger("operation-outcome", {
            operationId: "cast:save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:cast-failed")],
          do: [
            operation("apply-artifact", {
              id: "cast:apply-blinded",
              artifactId: "sunbeam-blinded",
              target: "target:cast-failed",
            }),
          ],
        }),
        rule({
          id: "recast-sunbeam",
          on: trigger("action-used", { actionId: "recast" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "sunbeam-source",
              subject: "source",
            }),
          ],
          targets: [
            placedTemplate("target:recast", {
              type: "line",
              size: 60,
              width: 5,
              range: null,
              rangeUnits: "self",
              evaluation: "snapshot",
            }),
          ],
          do: [
            operation("saving-throw", {
              id: "recast:save",
              ability: ["con"],
              target: "target:recast",
              onSave: "half",
            }),
            operation("damage", {
              id: "recast:damage",
              target: "target:recast",
              formula: dice(6, 8),
              damageTypes: ["radiant"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "recast-sunbeam-save-failed",
          on: trigger("operation-outcome", {
            operationId: "recast:save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:recast-failed")],
          do: [
            operation("apply-artifact", {
              id: "recast:apply-blinded",
              artifactId: "sunbeam-blinded",
              target: "target:recast-failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Cast 与 Recast 都是从施法者位置定向放置的 60-ft-long、5-ft-wide line snapshot；只结算各自模板快照内的 creature，线外目标保持不变",
    "Cast 消耗一个六环或更高法术位，建立最长一分钟专注与 sunbeam-source，并在同一次 workflow 结算第一束；Recast 仅在该来源存续时可用且不再次消耗法术位",
    "每束内目标分别进行 Constitution save；失败承受 6d8 radiant damage 并在施法者下一回合前陷入 blinded，成功承受一半且不目盲",
    "2024 不再给亡灵与泥怪的该豁免附加劣势",
    "每次豁免失败各自建立独立 source-target blinded 效果，并在施法者下一回合开始精确到期；专注结束是提前清理兜底",
    "解除、替换或到期结束专注时删除 sunbeam-source、关闭 Recast，并清理仍未到施法者下一回合的本来源 blinded 效果",
  ], { status: "compiler-passed" }),
});

export default sunbeam;
