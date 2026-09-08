import {
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

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const sunbeam = cleanRoomSpell({
  id: "sunbeam",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "evo",
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
      "每束结算前由 DM 识别 undead 与 ooze，并让这些目标以劣势进行 Constitution save；runtime 不推断 creature type 或改写豁免掷骰模式",
      "施法者产生 30 ft bright light 与额外 30 ft dim light、该光为 sunlight 及其环境交互均由 DM 处理；首波不创建光照或视觉 Artifact",
      "DM 保证后续每回合至多使用一次 Recast 并消耗该回合的 action；source gate 只证明法术来源仍存续，不充当 action economy 状态机",
    ],
  },
  fragments: [
    graphFragment({
      id: "sunbeam-graph",
      actions: [
        publicAction("cast", "阳炎射线 Sunbeam"),
        publicAction("recast", "阳炎射线：再次发射 Sunbeam: Recast", {
          activationType: "action",
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
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Cast 与 Recast 都是从施法者位置定向放置的 60-ft-long、5-ft-wide line snapshot；只结算各自模板快照内的 creature，线外目标保持不变，瞬时射线模板不作为持续区域保留",
    "Cast 消耗一个六环或更高法术位，建立最长一分钟专注与 source-bound sunbeam-source，并在同一次 workflow 结算第一束；Recast 仅在该来源存续时可用且不再次消耗法术位",
    "每束内目标分别进行 Constitution save；失败承受 6d8 radiant damage，成功承受一半且不获得 blinded",
    "每次豁免失败各自建立独立 source-target blinded Effect，并在施法者下一回合开始精确到期；一轮时长是异常回合顺序上限，专注结束是提前清理兜底",
    "Recast 的新失败实例不替换或刷新旧 blind 的期限；旧实例仍按自己的 source-turn 到期，多施法来源的 blind、来源门控与 cleanup 相互隔离",
    "解除、替换或到期结束专注时删除 sunbeam-source、关闭 Recast，并清理仍未到施法者下一回合的本来源 blinded Effect",
    "undead/ooze 的豁免劣势、30 ft bright 与额外 30 ft dim、sunlight 语义及每回合一次 action economy 保持明确 DM omission",
  ], { status: "compiler-runtime-passed" }),
});

export default sunbeam;
