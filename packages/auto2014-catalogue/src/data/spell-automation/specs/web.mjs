import {
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  operation,
  placedTemplate,
  predicate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const web = cleanRoomSpell({
  id: "web",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  content: contentRef("web"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "蛛网区域是 difficult terrain 且 lightly obscured；当前 DSL/runtime 没有区域移动消耗或轻度遮蔽的可靠机械原语，暂由 DM 处理",
      "未锚定在两个实体之间、也未铺在地板、墙壁或天花板上的蛛网会在施法者下一回合开始时坍塌；当前没有可验证场景锚点的几何查询，需由 DM 结束法术",
      "只有生物在自己的回合进入蛛网时才进行 Dexterity save；当前 enter 事件没有‘移动者就是当前 combatant’谓词，自动化会在任意时点进入时请求豁免，由 DM 忽略非目标自身回合的结果",
      "同一生物同一回合多次离开再进入蛛网时，当前 zone receipt 只结算第一次进入或回合开始事件；后续重复进入的额外 Dexterity save 由 DM 补掷",
      "被束缚者可用自己的 action 进行 Strength check 对抗来源 spell save DC，成功后解除自身本来源 restrained；当前缺少由 target effect 授予 action、跨来源 DC ability check 与精确自助解除的组合原语，暂由 DM 掷检定并移除效果",
      "蛛网的 5-ft cube 被火点燃、一轮后烧毁以及在火中开始回合承受 2d4 fire damage，需要可燃子区域与局部销毁状态机；当前不自动处理",
      "ActiveAuras 0.12.7 对 measured template 只提供 XY membership；20-ft cube 的垂直边界与不同 elevation 的成员关系由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "web-zone-graph",
      actions: [publicAction("cast", "放置蛛网术 Place Web")],
      artifacts: [
        artifact({
          id: "web-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "cube", size: 20, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("web-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Web Area",
          markerOnly: true,
          lifecycle: whileArtifact("web-zone"),
        }),
        cleanRoomEffect("web-restrained", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Web Restrained",
          modifiers: [grantStatus("restrained")],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-web",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cube",
              size: 20,
              range: 60,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "web-zone",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "web-entry-save",
          on: trigger("enter", { zoneId: "web-zone" }),
          when: [
            predicate("once-per-turn", {
              identity: "zoneInstanceId + targetUuid + turn",
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
          id: "web-entry-save-failed",
          on: trigger("operation-outcome", {
            operationId: "entry-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed-entry")],
          do: [
            operation("apply-artifact", {
              id: "entry:apply-restrained",
              artifactId: "web-restrained",
              target: "target:failed-entry",
            }),
          ],
        }),
        rule({
          id: "web-turn-start-save",
          on: trigger("turn-start", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "web-membership",
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
              ability: ["dex"],
              target: "target:turn",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "web-turn-start-save-failed",
          on: trigger("operation-outcome", {
            operationId: "turn-start-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed-turn")],
          do: [
            operation("apply-artifact", {
              id: "turn-start:apply-restrained",
              artifactId: "web-restrained",
              target: "target:failed-turn",
            }),
          ],
        }),
        rule({
          id: "web-leave",
          on: trigger("leave", { zoneId: "web-zone" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "web-restrained",
              subject: "effect-target",
            }),
          ],
          targets: [eventTarget("target:leave")],
          do: [
            operation("delete-artifact", {
              id: "leave:remove-restrained",
              artifactId: "web-restrained",
              target: "target:leave",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "DM 在施法者 60 ft 内放置一个边长 20 ft 的立方体持续区域，并只消耗一个二环或更高法术位；施法瞬间不会错误地让已有成员立即豁免",
    "未被束缚的 creature 进入区域或在区域内开始回合时进行 Dexterity save；成功不改变，失败获得本来源的 restrained；非目标自身回合的进入结果由 DM 按 omission 口径判断",
    "已经 restrained 的成员在区域内开始回合仍按规则进行 Dexterity save；单次成功不会错误地解除既有 restrained，失败只替换同一来源效果而不重复堆叠",
    "离开区域会删除该施法来源的 Web Restrained；解除、替换或到期结束专注会删除区域、成员 marker 与仍存在的 restrained，且不清理其他来源效果",
    "difficult terrain、lightly obscured、锚定坍塌、own-turn 进入判定、同回合重复进入、目标 action 挣脱及 5-ft 可燃子区域均保持明确 omission，不由普通速度修饰、重复 save 或整区火焰伤害冒充",
    "区域成员判定只有 XY 保证；20-ft cube 的垂直边界由 DM 处理",
  ], { status: "compiler-runtime-passed" }),
});

export default web;
