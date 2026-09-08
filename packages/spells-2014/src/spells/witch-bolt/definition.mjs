import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
  dice,
  duration,
  eventTarget,
  graphFragment,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  requiresSourceArtifact,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const witchBolt = cleanRoomSpell({
  id: "witch-bolt",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  content: contentRef("witch-bolt"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "施法者把自己的 action 用在其他事情上时法术应结束，由 DM 裁定",
      "目标离开施法者 30 ft 时法术应结束，由 DM 裁定",
      "目标相对施法者获得全掩护时法术应结束，由 DM 裁定",
      "初始攻击未命中时不建立目标标记，此时专注与法术是否终止由 DM 裁定",
      "后续伤害的目标合法性依赖 DM 按 marker 声明；CLI 只校验目标持有本来源的 Witch Bolt 标记，不校验三条断链条件",
    ],
  },
  fragments: [
    graphFragment({
      id: "witch-bolt-graph",
      actions: [
        publicAction("cast", "巫术箭 Witch Bolt"),
        publicAction("bolt", "巫术箭：持续电击 Sustained Bolt", {
          activationType: "action",
          availableWhen: [requiresSourceArtifact("witch-bolt-source")],
        }),
      ],
      artifacts: [
        cleanRoomEffect("witch-bolt-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Witch Bolt",
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("witch-bolt-mark", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Witch Bolt",
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-witch-bolt",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 30,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("attack-roll", {
              id: "cast:attack",
              target: "target:cast",
              attack: {
                source: "spellcasting",
                range: "ranged",
              },
            }),
            operation("damage", {
              id: "cast:damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(1, 12),
                dice(1, 12),
              ),
              damageTypes: ["lightning"],
            }),
            operation("apply-artifact", {
              id: "cast:apply-source",
              artifactId: "witch-bolt-source",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "apply-witch-bolt-mark-on-hit",
          on: trigger("operation-outcome", {
            operationId: "cast:attack",
            outcome: "hit",
          }),
          targets: [eventTarget("hit-target")],
          do: [
            operation("apply-artifact", {
              id: "hit:apply-witch-bolt-mark",
              artifactId: "witch-bolt-mark",
              target: "hit-target",
            }),
          ],
        }),
        rule({
          id: "sustained-bolt",
          on: trigger("action-used", { actionId: "bolt" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "witch-bolt-source",
              subject: "source",
            }),
          ],
          targets: [
            selected("target:bolt", {
              min: 1,
              max: 1,
              range: 30,
              predicates: [
                predicate("artifact-exists", {
                  artifactId: "witch-bolt-mark",
                  subject: "target",
                }),
              ],
            }),
          ],
          do: [
            operation("damage", {
              id: "bolt:damage",
              target: "target:bolt",
              formula: dice(1, 12),
              damageTypes: ["lightning"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "对 30 ft 内一个声明 creature 进行 ranged spell attack，只消耗一个一环或更高法术位，并建立最长一分钟的专注与来源绑定的 witch-bolt-source marker",
    "初始攻击命中造成 1d12 lightning damage，每升一环仅初始伤害增加 1d12；暴击翻倍交给 Midi",
    "命中才在目标上建立来源绑定的 witch-bolt-mark；未命中不造成伤害也不建立标记",
    "bolt 是独立 action，只在施法者持有 witch-bolt-source 时可见可用，且不再次消耗法术位",
    "bolt 对 DM 声明的目标自动造成恒定 1d12 lightning damage：无攻击骰、无豁免、不随环位缩放",
    "bolt 的声明目标必须持有本来源的 witch-bolt-mark，否则 preflight 拒绝该次声明",
    "专注结束或一分钟到期时清理本次来源的 witch-bolt-source 与 witch-bolt-mark，bolt 随之不再可用",
    "三条断链条件、未命中后的专注处理与目标合法性校验严格保留在 support omissions，不误报为已实现",
  ], { status: "compiler-runtime-passed" }),
});

export default witchBolt;
