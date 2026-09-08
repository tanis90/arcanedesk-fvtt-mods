import {
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  eventTarget,
  graphFragment,
  operation,
  perSlotAboveBase,
  placedTemplate,
  predicate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const QA_LOG =
  "docs/foundry-automation/notes/spell-level-5-wave-i3-qa-2026-08-26.md";

const cloudkillDamage = perSlotAboveBase(
  dice(5, 8),
  dice(1, 8),
);

const oncePerTurn = () => predicate("once-per-turn", {
  identity: "zoneInstanceId + targetUuid + turn",
});

const cloudkill = cleanRoomSpell({
  id: "cloudkill",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "每个施法者回合开始时，DM 将模板沿选定的远离施法者方向移动 10 ft；系统不自动决定方向、消耗移动动作或移动模板",
      "区域为 heavily obscured；当前 membership marker 不修改视线、攻击或可见性规则，由 DM 处理",
      "2014 RAW 的云雾会绕过拐角、贴地滚动、下沉至地形最低处并灌入开口；墙体、地形、高度、elevation 与精确三维扩散由 DM 调整合法成员",
      "强风会吹散云雾并结束法术；当前 runtime 没有结构化环境风事件，需要时由 DM 结束专注",
    ],
  },
  fragments: [
    graphFragment({
      id: "cloudkill-zone-graph",
      actions: [publicAction("cast", "放置死云术 Place Cloudkill")],
      artifacts: [
        artifact({
          id: "cloudkill-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "movable-template",
            shape: { type: "sphere", radius: 20, units: "ft" },
            stationary: false,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("cloudkill-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Cloudkill Area",
          markerOnly: true,
          lifecycle: whileArtifact("cloudkill-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-cloudkill",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "sphere",
              size: 20,
              range: 120,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "cloudkill-zone",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "cloudkill-entry",
          on: trigger("enter", { zoneId: "cloudkill-zone" }),
          when: [oncePerTurn()],
          targets: [eventTarget("target:entry")],
          do: [
            operation("saving-throw", {
              id: "entry-save",
              ability: ["con"],
              target: "target:entry",
              onSave: "half",
            }),
            operation("damage", {
              id: "entry-damage",
              target: "target:entry",
              formula: cloudkillDamage,
              damageTypes: ["poison"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "cloudkill-turn-start",
          on: trigger("turn-start", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "cloudkill-membership",
              subject: "effect-target",
            }),
            oncePerTurn(),
          ],
          targets: [eventTarget("target:turn-start")],
          do: [
            operation("saving-throw", {
              id: "turn-start-save",
              ability: ["con"],
              target: "target:turn-start",
              onSave: "half",
            }),
            operation("damage", {
              id: "turn-start-damage",
              target: "target:turn-start",
              formula: cloudkillDamage,
              damageTypes: ["poison"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Cast 是 placed-template public Activity；DM 在施法者 120 ft 内放置一个 20-ft-radius 可移动球形区域，一次调用只消费一个五环或更高法术位并建立最长 10 分钟专注",
    "区域出现时不会立即结算伤害；creature 每回合首次主动进入区域或在区域内开始自己的回合时，使用同一来源 DC 进行 Constitution save",
    "豁免失败承受 5d8 poison damage，成功承受一半；每高于五环一环增加 1d8，并继承首次施法的实际环位",
    "entry 与 turn-start 共享 zoneInstanceId + targetUuid + turn receipt；同一区域、目标和回合至多结算一次，重复 membership/event 不重复伤害",
    "DM 在每个施法者回合开始时将模板沿选定方向移动 10 ft；模板手工移动刷新区域成员，但不会触发生物主动进入区域的 entry 结算",
    "解除、替换或到期结束专注时按 cast identity 删除区域模板与成员 marker；不同施法来源的模板、成员和 receipt 相互隔离，区域外非目标保持不变",
    "heavily obscured、绕角、贴地滚动、下沉、强风吹散和精确三维成员关系保持明确 DM omission，不被二维模板或 marker 冒充为完整支持",
  ], { status: "compiler-runtime-passed" }),
});

export default cloudkill;
