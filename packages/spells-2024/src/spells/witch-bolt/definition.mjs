import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
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

// L4 移植批（G 桶，非 SRD，spells24 无源文档）：2014 recipe 搬运改契约。
// 5R 锚点 Witch_Bolt（1环.htm）：头部 一环 塑能（术士、魔契师、法师），V/S/M，60尺，专注1分钟。
// 与 2014 差异：射程 30→60；初始伤害 1d12→2d12；后续电击改为附赠动作且首次未命中仍可续伤（2014 仅命中后）。

const witchBolt = cleanRoomSpell({
  id: "witch-bolt",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
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
      "目标离开 60 ft 施法距离或相对施法者获得全身掩护时法术应提前终止，由 DM 裁定",
      "施法者未持续维持与目标的闪电弧（例如回合顺序或场景切换）时的终止由 DM 裁定",
      "后续伤害的目标合法性依赖 DM 按 marker 声明；CLI 只校验目标持有本来源的 Witch Bolt 标记，不校验两条断链条件",
      "目标必须能被施法者看见；当前 selected-targets 原语没有通用可见性校验，由 DM 在声明目标时判断",
      "5R 允许首次攻击未命中后继续用电击；mark 挂在攻击 activity 上只随命中施加，未命中时 Foundry 不会自动落 mark，DM 需手动给原目标补上 Witch Bolt 效果后再用附赠动作续伤",
    ],
  },
  fragments: [
    graphFragment({
      id: "witch-bolt-graph",
      actions: [
        publicAction("cast", "巫术箭 Witch Bolt"),
        publicAction("bolt", "巫术箭：持续电击 Sustained Bolt", {
          activationType: "bonus",
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
              range: 60,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-source",
              artifactId: "witch-bolt-source",
              target: "source",
            }),
            operation("apply-artifact", {
              id: "cast:apply-mark",
              artifactId: "witch-bolt-mark",
              target: "target:cast",
            }),
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
                dice(2, 12),
                dice(1, 12),
              ),
              damageTypes: ["lightning"],
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
              range: 60,
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
  accepted: acceptance(QA_LOG, [
    "对 60 ft 内一个 creature 进行 ranged spell attack，只消耗一个一环或更高法术位，并建立最长一分钟的专注、来源 marker 与目标 mark",
    "初始攻击命中造成 2d12 lightning；每升一环只让初始伤害增加 1d12，暴击翻倍交给 Midi",
    "命中时在目标上建立来源绑定的 witch-bolt-mark；未命中不造成初始伤害，此时 mark 需由 DM 手动补上（见 omissions）",
    "bolt 是附赠动作，只在施法者持有 witch-bolt-source 时可见可用，且不再次消耗法术位",
    "bolt 对 DM 声明的目标自动造成恒定 1d12 lightning：无攻击骰、无豁免、不随环位缩放",
    "bolt 的声明目标必须持有本来源的 witch-bolt-mark，否则 preflight 拒绝该次声明",
    "专注结束或一分钟到期时清理本次来源的 source 与 mark，bolt 随之不再可用",
    "超出射程、全身掩护与目标可见性等断链条件严格保留在 support omissions，不误报为已实现",
  ], { status: "compiler-passed" }),
});

export default witchBolt;
