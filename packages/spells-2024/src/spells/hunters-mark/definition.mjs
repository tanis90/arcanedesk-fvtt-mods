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
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 C 桶 recipe-invalid，c-dm）：2024 的额外伤害改为「任意攻击命中」
// 的 1d6 力场（2014 是武器命中并继承父伤害类型）；附赠动作、90 尺与专注不变。
// 5R 锚点：玩家手册2024/法术详述/1环.htm#Hunter's_Mark。
const huntersMark = cleanRoomSpell({
  id: "hunters-mark",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "div",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "2024 以附赠动作把标记转移到新目标仍由 DM 处理（删除旧标记并重施本来源效果）",
      "为寻找目标而进行的感知（察觉或求生）检定优势不自动结算",
      "升环持续时间尚未建模；当前只承诺一环的一小时，三/四环八小时与五环以上二十四小时由 DM 处理",
      "visible-to-source 目前只进入 interaction projection，不由通用 runtime 独立校验视线；DM 负责只声明施法者可见的目标",
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
          targets: [
            selected("target:cast", {
              max: 1,
              range: 90,
              predicates: [predicate("visible-to-source")],
            }),
          ],
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
          id: "marked-target-attack-hit",
          on: trigger("operation-outcome", {
            operationId: "external:source-attack",
            outcome: "hit",
          }),
          when: [
            predicate("attack-kind", { value: "attack" }),
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
              damageTypes: ["force"],
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
    "来源施法者的任意攻击检定（武器或法术）命中自己的标记者时，追加 1d6 力场伤害到同一个父伤害 roll",
    "未命中、未标记目标或其他来源施法者的同名 marker 均不触发附伤",
    "暴击骰由父伤害 workflow 与 midi-qol 统一处理，rider 不自行预先翻倍",
    "专注结束或一小时到期时清理 marker",
    "不把尚未承诺的追踪优势、标记转移或升环时长误报为已实现",
  ], { status: "compiler-passed" }),
});

export default huntersMark;
