import {
  QA_LOG,
  acceptance,
  artifact,
  blockActionKinds,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  eventTarget,
  firstOf,
  grantStatus,
  graphFragment,
  operation,
  placedTemplate,
  predicate,
  publicAction,
  rule,
  spellContract,
  trigger,
  untilTrigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 A 桶 desc-diff-flag）：2024 改为中毒且不能执行动作/
// 附赠动作，并删去「不需呼吸或免疫毒素自动成功」。
// 5R 锚点：5R 玩家手册2024 3环.htm#Stinking_Cloud。
const stinkingCloud = cleanRoomSpell({
  id: "stinking-cloud",
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
      "5R 同时禁止动作与附赠动作；block-action-kinds 只接受 attack/spell/reaction/action，没有 bonus-action kind，本次只阻断 action，附赠动作由 DM 手动限制",
      "云雾区域为 heavily obscured，对视线、攻击与可见性前提的机械影响由 DM 处理；成员 marker 不冒充遮蔽规则",
      "5R 只有在其回合开始时位于云团内的 creature 需要豁免；施法瞬间与进入时都不豁免，符合当前 turn-start 脉冲",
      "至少 10 mph 的风吹散云雾需要结构化环境风事件，需要时由 DM 结束该法术",
      "ActiveAuras 对 measured template 只提供 XY membership；sphere 的垂直边界与不同 elevation 的成员关系由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "stinking-cloud-zone-graph",
      actions: [publicAction("cast", "放置臭云术 Place Stinking Cloud")],
      artifacts: [
        artifact({
          id: "stinking-cloud-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "sphere", radius: 20, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("stinking-cloud-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Stinking Cloud Area",
          markerOnly: true,
          lifecycle: whileArtifact("stinking-cloud-zone"),
        }),
        cleanRoomEffect("stinking-cloud-retching", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Stinking Cloud: Retching",
          modifiers: [
            grantStatus("poisoned"),
            blockActionKinds(["action"]),
          ],
          lifecycle: firstOf(
            whileSpellActive(),
            untilTrigger(trigger("turn-end", { subject: "current-turn" })),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-stinking-cloud",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "sphere",
              size: 20,
              range: 90,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "stinking-cloud-zone",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "stinking-cloud-turn-start-save",
          on: trigger("turn-start", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "stinking-cloud-membership",
              subject: "effect-target",
            }),
            predicate("once-per-turn", {
              identity: "zoneInstanceId + targetUuid + turn",
            }),
          ],
          targets: [eventTarget("target:turn")],
          do: [
            operation("saving-throw", {
              id: "turn-start-save",
              ability: ["con"],
              target: "target:turn",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "stinking-cloud-turn-start-save-failed",
          on: trigger("operation-outcome", {
            operationId: "turn-start-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed-turn")],
          do: [
            operation("apply-artifact", {
              id: "turn-start:apply-retching",
              artifactId: "stinking-cloud-retching",
              target: "target:failed-turn",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 在施法者 90 ft 内放置半径 20 ft 的球形区域，只消耗一个三环或更高法术位并建立最长 1 分钟专注",
    "creature 进入区域时不进行豁免；只有在自己的回合开始时位于区域内，才进行 Constitution save，凭 zoneInstanceId + targetUuid + turn 每回合去重",
    "豁免失败的 creature 获得来源绑定的 retching 效果：陷入 poisoned，且当前回合不能执行 action（附赠动作仍需 DM 限制）",
    "该效果到当前回合结束时失效，本回合中途离开区域不会提前清除",
    "解除、替换或到期结束专注时删除区域、全部成员 marker 与仍存在的 retching 效果；不同施法来源按 cast identity 隔离",
    "heavily obscured、附赠动作阻断与风力吹散保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default stinkingCloud;
