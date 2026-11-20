import {
  QA_LOG,
  acceptance,
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
  spellContract,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L4 移植批（非 SRD，spells24 无源文档）：G 桶 + 2014 recipe banishing-smite。
// 5R 锚点 五环.htm#Banishing_Smite。与 2014 差异：学派 防护→咒法；50 生命值阈值后新增魅力豁免；成分仅 V。
const banishingSmite = cleanRoomSpell({
  id: "banishing-smite",
  contract: spellContract({
    ruleset: "2024",
    level: 5,
    school: "con",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
    primaryActionId: "declare",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "5R 的施法时机是近战武器或徒手打击命中之后；declared-rider 把附赠动作提前到命中之前声明，未命中不耗槽，也不重放伤害",
      "「此次攻击把目标生命值削减到 50 点或更低」的阈值判断、随后的魅力豁免、以及放逐到无害半位面均由 DM 手工结算；DSL 没有基于权威伤害回执的生命值阈值谓词",
      "半位面期间的 incapacitated、Token 隐藏与位置记录、法术终止后的原位或最近未占据空间返回，全部保持 DM 处理；系统只自动化这次命中的 5d10 力场伤害",
    ],
  },
  fragments: [
    graphFragment({
      id: "banishing-smite-rider",
      actions: [
        publicAction("declare", "放逐斩 Banishing Smite", {
          activationType: "bonus",
          delivery: "declared-rider",
        }),
      ],
      rules: [
        rule({
          id: "resolve-declared-rider",
          on: trigger("operation-outcome", {
            operationId: "external:triggering-weapon-attack",
            outcome: "hit",
          }),
          when: [
            predicate("declared"),
            predicate("attack-kind", { value: "melee-weapon" }),
          ],
          targets: [eventTarget("target:hit")],
          do: [
            consume("rider:consume", "on-hit"),
            operation("damage", {
              id: "rider:damage",
              target: "target:hit",
              formula: dice(5, 10),
              damageTypes: ["force"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Declare 是 bonus-action declared rider；只有下一次真实 melee weapon attack 命中时才消耗一个五环法术位，未命中保持法术位与目标状态不变",
    "命中向父武器伤害注入一次 5d10 force damage，暴击扩骰交给 Midi",
    "命中后系统不掷豁免、不建立放逐 marker：50 HP 阈值、魅力豁免与半位面放逐由 DM 按 5R 原文结算",
    "命中不减少目标生命值或目标剩余生命值大于 50 时，不得触发任何放逐状态；该判断由 DM 依据权威伤害回执确认",
    "重复施法只替换本次声明的 rider，不修改其他来源、其他 Actor 或无关世界状态",
  ], { status: "compiler-passed" }),
});

export default banishingSmite;
