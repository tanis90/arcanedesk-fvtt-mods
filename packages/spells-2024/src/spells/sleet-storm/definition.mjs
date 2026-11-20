import {
  QA_LOG,
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
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
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：区域由半径 40 ft/高 20 ft 改为
// 半径 20 ft/高 40 ft，且倒地与失去专注合并为同一次敏捷豁免。
// 5R 锚点：5R 玩家手册2024 3环.htm#Sleet_Storm。
const sleetStorm = cleanRoomSpell({
  id: "sleet-storm",
  contract: spellContract({
    ruleset: "2024",
    level: 3,
    school: "con",
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
      "5R 中同一次敏捷豁免失败还会失去专注；现有原语没有 save-failure → end-concentration 接线，concentrationDisruption 会另掷一次独立豁免（与 RAW 的同一次豁免不符），因此该条由 DM 在豁免失败时手动结束专注",
      "区域内 heavily obscured 对视线、攻击与可见性前提的机械影响由 DM 处理；区域只建立可见模板与成员 marker",
      "区域内的明火被浇熄及与其他区域/火焰的互动由 DM 处理",
      "地面为 difficult terrain，需按实际穿越路径增加移动消耗；当前没有 zone movement-cost 原语，由 DM 处理",
      "倒地后的起身（花费一半移动力）由 DM/玩家按常规机械手动处理；prone 效果使用 manual lifecycle，不随区域结束或离开自动解除",
      "通过非移动方式进入区域（如被传送、或 DM 拖动模板覆盖）不会触发进入豁免，这类敏捷豁免由 DM 补掷",
      "ActiveAuras 对 measured template 只提供 XY membership；cylinder 的 40 ft height 保留为 provider 元数据，不同 elevation 的成员关系由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "sleet-storm-zone-graph",
      actions: [publicAction("cast", "放置雪雨暴 Place Sleet Storm")],
      artifacts: [
        artifact({
          id: "sleet-storm-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "cylinder", radius: 20, height: 40, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("sleet-storm-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Sleet Storm Area",
          markerOnly: true,
          lifecycle: whileArtifact("sleet-storm-zone"),
        }),
        cleanRoomEffect("sleet-storm-prone", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Sleet Storm Prone",
          modifiers: [grantStatus("prone")],
          lifecycle: manual(),
        }),
      ],
      rules: [
        // 5R 无"法术出现时在区域内即豁免"条款，施法瞬间不做初始敏捷豁免；
        // 首次结算发生在进入或区域内 turn-start 脉冲。
        rule({
          id: "cast-sleet-storm",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cylinder",
              size: 20,
              height: 40,
              range: 150,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "sleet-storm-zone",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "sleet-storm-entry-save",
          on: trigger("enter", { zoneId: "sleet-storm-zone" }),
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
          id: "sleet-storm-entry-save-failed",
          on: trigger("operation-outcome", {
            operationId: "entry-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed-entry")],
          do: [
            operation("apply-artifact", {
              id: "entry:apply-prone",
              artifactId: "sleet-storm-prone",
              target: "target:failed-entry",
            }),
          ],
        }),
        rule({
          id: "sleet-storm-turn-start-save",
          on: trigger("turn-start", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "sleet-storm-membership",
              subject: "effect-target",
            }),
            predicate("once-per-turn", {
              identity: "zoneInstanceId + targetUuid + turn + phase",
            }),
          ],
          targets: [eventTarget("target:turn-start")],
          do: [
            operation("saving-throw", {
              id: "turn-start-save",
              ability: ["dex"],
              target: "target:turn-start",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "sleet-storm-turn-start-save-failed",
          on: trigger("operation-outcome", {
            operationId: "turn-start-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed-turn-start")],
          do: [
            operation("apply-artifact", {
              id: "turn-start:apply-prone",
              artifactId: "sleet-storm-prone",
              target: "target:failed-turn-start",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 在 150 ft 内放置半径 20 ft、高 40 ft 的圆柱持续区域；一次合法施法只消耗一个三环或更高法术位，并建立最长一分钟专注",
    "施法瞬间位于区域内的 creature 不做立即 Dexterity save（5R 无出现即豁免条款）；首次结算发生在其每回合首次进入区域或在区域内开始回合时",
    "两类脉冲凭 zone receipt 每回合各结算一次，失败获得来源绑定的 prone，成功不改变",
    "5R 的同一次豁免失败还要失去专注；该条无原语接线，由 DM 手动结束专注",
    "已应用的 prone 为 manual lifecycle，不随离开区域、区域结束或法术到期自动解除，由 DM/玩家按常规起身机械手动处理",
    "任意阵营 creature 进入与离开区域时动态获得或移除本次施法实例的成员 marker，作为 difficult terrain 提示",
    "解除、替换或到期结束专注时删除对应区域模板与成员 marker；不同施法来源按 cast identity 隔离",
    "heavily obscured、明火浇熄与垂直边界保持明确 omission，不由模板或 marker 冒充",
  ], { status: "compiler-passed" }),
});

export default sleetStorm;
