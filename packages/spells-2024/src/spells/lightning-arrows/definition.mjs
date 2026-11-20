import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  eventNeighborhood,
  eventTarget,
  graphFragment,
  instant,
  manual,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L4 移植批（G 桶，非 SRD，spells24 无源文档）：2014 recipe 搬运改契约。
// 5R 锚点 Lightning_Arrows（3环.htm）：头部 三环 变化（游侠），V/S，附赠动作紧接武器远程攻击命中或失手。
// 与 2014 差异：持续时间由专注1分钟改为立即；4d8/2d8、10 ft 邻域与每环 +1d8 机制一致。

function lightningSplashRule(outcome) {
  const primaryDamageId = `next-attack:${outcome}-lightning-damage`;
  const targetId = `target:splash:${outcome}`;

  return rule({
    id: `lightning-arrow-splash-after-${outcome}`,
    on: trigger("operation-complete", {
      operationId: primaryDamageId,
    }),
    targets: [
      eventNeighborhood(targetId, {
        anchor: "target",
        radius: 10,
        units: "ft",
        includeAnchor: false,
        kind: "creature",
      }),
    ],
    do: [
      operation("saving-throw", {
        id: `splash:${outcome}:save`,
        ability: ["dex"],
        target: targetId,
        onSave: "half",
      }),
      operation("damage", {
        id: `splash:${outcome}:lightning-damage`,
        target: targetId,
        formula: perSlotAboveBase(
          dice(2, 8),
          dice(1, 8),
        ),
        damageTypes: ["lightning"],
        onSave: "half",
      }),
    ],
  });
}

const lightningArrows = cleanRoomSpell({
  id: "lightning-arrows",
  contract: spellContract({
    ruleset: "2024",
    level: 3,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
    primaryActionId: "cast",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "5R 以本次攻击造成的全部伤害与其他效果作为替代；现有 DSL 只提供 triggering-weapon-base-damage 替换模式，本定义仅替换武器基础伤害并保留其他独立 rider（如猎人印记、斩击类附伤），DM 需在命中后忽略这些附加伤害",
      "5R 的 bonus action 紧接在武器远程攻击命中或失手之后；DSL 以 ready marker 建模，DM 需确认该次 bonus action 确实紧随触发攻击，并在没有后续攻击时手动清除 marker",
      "CLI 当前不能为 dagger/handaxe 等 melee + thrown 武器明确声明本次使用投掷模式；本法术只承诺原生 ranged weapon attack 条目",
    ],
  },
  fragments: [
    graphFragment({
      id: "lightning-arrows-graph",
      actions: [
        publicAction("cast", "闪电箭矢 Lightning Arrows", {
          activationType: "bonus",
        }),
      ],
      artifacts: [
        cleanRoomEffect("lightning-arrow-ready", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Lightning Arrows: Ready",
          markerOnly: true,
          lifecycle: manual(),
        }),
      ],
      rules: [
        rule({
          id: "cast-lightning-arrow",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-ready",
              artifactId: "lightning-arrow-ready",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "resolve-next-ranged-weapon-hit",
          on: trigger("operation-outcome", {
            operationId: "external:source-ranged-weapon-attack",
            outcome: "hit",
          }),
          when: [
            predicate("attack-kind", { value: "ranged-weapon" }),
            predicate("artifact-exists", {
              artifactId: "lightning-arrow-ready",
              subject: "source",
            }),
          ],
          targets: [eventTarget("target:hit")],
          do: [
            operation("damage", {
              id: "next-attack:hit-lightning-damage",
              target: "target:hit",
              formula: perSlotAboveBase(
                dice(4, 8),
                dice(1, 8),
              ),
              damageTypes: ["lightning"],
              attachment: "triggering-attack",
              // Replace only the weapon's base damage; preserve independent riders.
              replacement: "triggering-weapon-base-damage",
            }),
            operation("delete-artifact", {
              id: "next-attack:consume-ready-on-hit",
              artifactId: "lightning-arrow-ready",
              target: "source",
            }),
          ],
        }),
        lightningSplashRule("hit"),
        rule({
          id: "resolve-next-ranged-weapon-miss",
          on: trigger("operation-outcome", {
            operationId: "external:source-ranged-weapon-attack",
            outcome: "miss",
          }),
          when: [
            predicate("attack-kind", { value: "ranged-weapon" }),
            predicate("artifact-exists", {
              artifactId: "lightning-arrow-ready",
              subject: "source",
            }),
          ],
          targets: [eventTarget("target:miss")],
          do: [
            operation("damage", {
              id: "next-attack:miss-lightning-damage",
              target: "target:miss",
              formula: perSlotAboveBase(
                dice(4, 8),
                dice(1, 8),
              ),
              damageTypes: ["lightning"],
              multiplier: 0.5,
              rounding: "down",
            }),
            operation("delete-artifact", {
              id: "next-attack:consume-ready-on-miss",
              artifactId: "lightning-arrow-ready",
              target: "source",
            }),
          ],
        }),
        lightningSplashRule("miss"),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "bonus-action self cast 只消耗一个三环或更高法术位，并建立一个手动清除的 Lightning Arrows ready marker；法术持续时间为立即，不建立专注",
    "marker 存续期间下一次真实 ranged weapon attack 无论命中或未命中都只消费一次 ready；其他攻击类型不消费也不触发法术",
    "命中时以基础 4d8 lightning 替换父攻击的武器基础伤害，并保留其他独立 rider；每升一环增加 1d8，暴击扩骰交给 Midi",
    "未命中时目标承受同一主伤害公式向下取整的一半；不会错误结算武器普通伤害",
    "命中或未命中后都以攻击目标为中心快照 10 ft 内除攻击目标外的其他 creature；每个邻近目标分别进行 Dexterity save，失败承受基础 2d8 lightning、成功一半，每升一环增加 1d8",
    "邻域伤害不是父攻击的暴击伤害，不随父攻击暴击扩骰；同一次攻击 outcome 只产生一轮邻域结算",
    "ready 被消费后同步删除；无后续攻击时由 DM 手动清除，且不会因专注结束自动清理（本法术没有专注）",
  ], { status: "compiler-passed" }),
});

export default lightningArrows;
