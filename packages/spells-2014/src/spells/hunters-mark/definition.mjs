import {
  COMPILER_MIGRATION_LOG,
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
  parentPrimaryDamageType,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const huntersMark = cleanRoomSpell({
  id: "hunters-mark",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "div",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  emission: { contentVersion: 7 },
  support: {
    level: "simplified",
    omissions: [
      "追踪目标的 Wisdom check 优势不自动结算",
      "目标降至 0 HP 后转移标记仍由 DM 处理",
      "升环持续时间尚未建模；当前只承诺一环的一小时，三/四环八小时与五环以上二十四小时由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "hunters-mark-graph",
      actions: [
        publicAction("cast", "猎人印记 Hunter's Mark", {
          activationType: "bonus",
        }),
      ],
      artifacts: [
        cleanRoomEffect("hunters-mark", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Hunter's Mark",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-hunters-mark",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [selected("target:cast", { max: 1, range: 90 })],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "hunters-mark",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "marked-target-weapon-hit",
          on: trigger("operation-outcome", {
            operationId: "external:source-weapon-attack",
            outcome: "hit",
          }),
          when: [
            predicate("attack-kind", { value: "weapon" }),
            predicate("artifact-exists", {
              artifactId: "hunters-mark",
              subject: "attack-target",
            }),
            predicate("artifact-source-matches", {
              artifactId: "hunters-mark",
              subject: "attack-target",
              source: "source",
            }),
          ],
          targets: [eventTarget("target:hit")],
          do: [
            operation("damage", {
              id: "hit:hunters-mark-damage",
              target: "target:hit",
              formula: dice(1, 6),
              damageTypes: [parentPrimaryDamageType()],
              attachment: "triggering-attack",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "bonus action 对 90 ft 内一个声明目标施法并只消耗一个一环法术位",
    "施法者建立专注，目标获得一个绑定来源施法者的 Hunter's Mark marker",
    "来源施法者真实武器命中自己的标记者时，把一次基础 1d6 以父攻击的主武器伤害类型注入同一个父伤害 roll",
    "未命中、未标记目标或其他来源施法者的同名 marker 均不触发附伤",
    "暴击骰由父伤害 workflow 与 midi-qol 统一处理，rider 不自行预先翻倍",
    "专注结束或一小时到期时清理 marker",
    "不把尚未承诺的追踪优势、标记转移或升环时长误报为已实现",
  ], { status: "compiler-runtime-passed" }),
});

export default huntersMark;
