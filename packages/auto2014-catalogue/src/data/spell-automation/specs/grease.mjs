import {
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  contentRef,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  manual,
  operation,
  placedTemplate,
  predicate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const grease = cleanRoomSpell({
  id: "grease",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
  }),
  content: contentRef("grease"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "10-ft square 区域为 difficult terrain，需按实际穿越路径增加移动消耗；当前 DSL/runtime 没有 zone movement-cost 原语，暂由 DM 处理（与 entangle/web 缺口径一致）",
      "倒地后的起身（花费一半移动力）由 DM/玩家按常规机械手动处理；prone 效果使用 manual lifecycle，不随区域结束或离开自动解除",
      "同一生物同一回合多次离开再进入区域时，当前 zone receipt 每回合只结算第一次进入；RAW 每次进入都应豁免，后续重复进入的 Dexterity save 由 DM 补掷",
      "通过非移动方式进入区域（如被传送、或 DM 拖动模板覆盖到生物上）不会触发进入豁免：当前 enter 事件只从 token 移动上下文检测，这类进入的 Dexterity save 由 DM 补掷",
      "ActiveAuras 对 measured template 只提供 XY membership；10-ft square 的垂直边界由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "grease-zone-graph",
      actions: [publicAction("cast", "放置油腻术 Place Grease")],
      artifacts: [
        artifact({
          id: "grease-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "square", size: 10, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("grease-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Grease Area",
          markerOnly: true,
          lifecycle: whileArtifact("grease-zone"),
        }),
        cleanRoomEffect("grease-prone", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Grease Prone",
          modifiers: [grantStatus("prone")],
          lifecycle: manual(),
        }),
      ],
      rules: [
        rule({
          id: "cast-grease",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "square",
              size: 10,
              range: 60,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "grease-zone",
              target: "target:cast",
            }),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["dex"],
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
              id: "failure:apply-prone",
              artifactId: "grease-prone",
              target: "target:failed",
            }),
          ],
        }),
        rule({
          id: "grease-entry-save",
          on: trigger("enter", { zoneId: "grease-zone" }),
          when: [
            predicate("once-per-turn", {
              identity: "zoneInstanceId + targetUuid + turn + phase",
            }),
          ],
          targets: [eventTarget("target:entry")],
          do: [
            operation("saving-throw", {
              id: "entry-save",
              ability: ["dex"],
              target: "target:entry",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "grease-entry-save-failed",
          on: trigger("operation-outcome", {
            operationId: "entry-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed-entry")],
          do: [
            operation("apply-artifact", {
              id: "entry:apply-prone",
              artifactId: "grease-prone",
              target: "target:failed-entry",
            }),
          ],
        }),
        rule({
          id: "grease-turn-end-save",
          on: trigger("turn-end", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "grease-membership",
              subject: "effect-target",
            }),
            predicate("once-per-turn", {
              identity: "zoneInstanceId + targetUuid + turn + phase",
            }),
          ],
          targets: [eventTarget("target:turn-end")],
          do: [
            operation("saving-throw", {
              id: "turn-end-save",
              ability: ["dex"],
              target: "target:turn-end",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "grease-turn-end-save-failed",
          on: trigger("operation-outcome", {
            operationId: "turn-end-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed-turn-end")],
          do: [
            operation("apply-artifact", {
              id: "turn-end:apply-prone",
              artifactId: "grease-prone",
              target: "target:failed-turn-end",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "DM 在施法者 60 ft 内放置一个边长 10 ft 的正方形油腻区域，并只消耗一个一环或更高法术位；法术持续 1 分钟，不建立专注",
    "只有施法瞬间位于正方形内的 creature 进行初始 Dexterity save；成功不改变，失败获得来源绑定的 prone；之后进入区域的 creature 不补做这次初始豁免",
    "creature 进入区域或在区域内结束自己的回合时进行 Dexterity save；两类脉冲凭 zone receipt 每回合各只结算一次，失败获得本来源 prone，成功不改变",
    "同一施法者的两片油腻区域按 cast identity 相互独立：各自的成员 receipt、豁免与 prone 应用分别结算，删除其一不影响另一片区域及其成员 marker",
    "1 分钟到期结束法术时按 cast 删除区域与成员 marker；已应用的 prone 为 manual lifecycle，不随区域结束或离开自动解除，由 DM/玩家按常规起身机械手动处理",
    "difficult terrain 的移动消耗、起身处理、同回合重复进入的额外豁免与非移动方式进入的豁免保持明确 omission，不以速度修改、重复 save 或自动解除冒充",
    "区域成员与初始目标判定只有 XY 保证；10-ft square 的垂直边界由 DM 处理",
  ], { status: "compiler-runtime-passed" }),
});

export default grease;
