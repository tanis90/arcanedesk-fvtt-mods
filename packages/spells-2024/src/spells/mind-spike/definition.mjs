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
  graphFragment,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：施法距离 60→120 ft；
// 3d8 心灵伤害 / 感知豁免半伤 / 升环 +1d8 不变，仍为专注最长 1 小时。
// 5R 锚点：5R 玩家手册2024 2环.htm#Mind_Spike。
const mindSpike = cleanRoomSpell({
  id: "mind-spike",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "div",
    components: {
      verbal: false,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "持续期间自动得知目标位置、阻止目标对施法者隐藏，以及目标隐形时不能对施法者获益均未实现；豁免失败的目标只获得一个可见、可随专注清理的追踪 marker",
    ],
  },
  fragments: [
    graphFragment({
      id: "mind-spike-graph",
      actions: [publicAction("cast", "心灵尖刺 Mind Spike")],
      artifacts: [
        cleanRoomEffect("mind-spike-tracking", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Mind Spike: Tracked",
          img: "systems/dnd5e/icons/svg/statuses/marked.svg",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-mind-spike",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 120,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["wis"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "psychic-damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(3, 8),
                dice(1, 8),
              ),
              damageTypes: ["psychic"],
              onSave: "half",
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
              id: "apply-mind-spike-tracking",
              artifactId: "mind-spike-tracking",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 选择一个 120 ft 内、由 DM 声明为施法者可见的 creature 进行 Wisdom save，只消耗一个二环或更高法术位",
    "豁免失败承受 3d8 psychic damage 并获得唯一来源绑定的追踪 marker；豁免成功承受一半伤害且不获得 marker",
    "每升一环增加 1d8 psychic damage",
    "施法建立最长一小时的专注；解除或替换专注时清理仍存在的追踪 marker",
    "marker 不代表自动得知位置、阻止隐藏或无视目标对施法者的隐形收益",
  ], { status: "compiler-passed" }),
});

export default mindSpike;
