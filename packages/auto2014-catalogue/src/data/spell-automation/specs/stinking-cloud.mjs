import {
  acceptance,
  artifact,
  blockActionKinds,
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
  rule,
  spellContract,
  trigger,
  untilTrigger,
  whileArtifact,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const stinkingCloud = cleanRoomSpell({
  id: "stinking-cloud",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  content: contentRef("stinking-cloud"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "云雾区域为 heavily obscured，对视线、攻击与可见性前提的机械影响由 DM 处理（与 fog-cloud 口径一致）；成员 marker 不冒充遮蔽规则",
      "RAW 只有“完全处于云内”的 creature 需要豁免；ActiveAuras membership 只有 XY 包含判定，无法区分部分覆盖与完全覆盖，边界 creature 由 DM 裁定",
      "不需要呼吸或免疫 poison 的 creature 自动豁免成功；当前 zone 脉冲没有按 trait/immunity 过滤或自动判成功的原语，这类 creature 的失败结果由 DM 忽略",
      "至少 10 mph 的中度风 4 轮后、至少 20 mph 的强风 1 轮后吹散云雾；当前 runtime 没有结构化环境风事件，需要时由 DM 结束该法术",
      "ActiveAuras 0.12.7 对 measured template 只提供 XY membership；sphere 的垂直边界与不同 elevation 的成员关系由 DM 处理",
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
        // BASE-LAYER-NEED: blockedActionKinds 封闭集合当前只接受
        // attack/spell/reaction（compiler 校验直接拒绝其他值）；2014 RAW 要求
        // 失败者的整个 action 被干呕消耗，需要新增 "action" kind——按有效
        // activation 过滤一切 action 活动，同时保留 bonus action、reaction 与
        // 移动。不能用 ["attack", "spell"] 冒充：那会错误阻断 bonus-action
        // 法术，又放不过 Dash/Dodge 等普通 action。
        cleanRoomEffect("stinking-cloud-retching", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Stinking Cloud: Retching",
          modifiers: [blockActionKinds(["action"])],
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
  accepted: acceptance(EXPANSION_BATCH, [
    "DM 在施法者 90 ft 内放置一个半径 20 ft 的球形臭云区域，只消耗一个三环或更高法术位并建立最长 1 分钟专注；施法瞬间区域内成员不做初始豁免",
    "creature 进入区域时不进行豁免；只有它在自己的回合开始时完全处于区域内，才进行 Constitution save，凭 zoneInstanceId + targetUuid + turn 每回合去重，成功不改变任何状态",
    "豁免失败的 creature 获得来源绑定的 retching Effect，到当前回合结束为止其有效 activation 为 action 的活动全部不可用（execute-turn 硬拒绝 ACTION_BLOCKED、preItemRollV2 拦截绕过），bonus action、reaction 与移动不受影响；该阻断依赖 blockedActionKinds 新增 \"action\" kind（BASE-LAYER-NEED，落地前此条不可执行）",
    "retching Effect 表示该 creature 本回合的 action 已被干呕消耗；它在当前回合结束或法术结束时到期，本回合中途离开区域不会提前清除该结果",
    "解除、替换或到期结束专注时删除区域、全部成员 marker 与仍存在的 retching Effect；不同施法来源按 cast identity 隔离，互不清算",
    "heavily obscured、“完全处于云内”判定、poison 免疫/无需呼吸自动成功与风力吹散均保持明确 omission，不以状态 marker 或额外豁免冒充",
    "区域成员与 retching 应用只有 XY 保证；sphere 的垂直边界由 DM 处理",
  ], { status: "compiler-runtime-passed" }),
});

export default stinkingCloud;
