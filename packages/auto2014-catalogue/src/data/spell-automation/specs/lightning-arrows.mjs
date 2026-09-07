import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  endSourceWhenLastDependentEnds,
  eventNeighborhood,
  eventTarget,
  graphFragment,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  rule,
  self,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

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
    ruleset: "2014",
    level: 3,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
    primaryActionId: "cast",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "CLI 当前不能为 dagger/handaxe 等 melee + thrown 武器明确声明本次使用投掷模式；本法术只承诺原生 ranged weapon attack 条目",
    ],
  },
  fragments: [
    graphFragment({
      id: "lightning-arrows-graph",
      actions: [
        publicAction("cast", "闪电箭矢 Lightning Arrow", {
          activationType: "bonus",
        }),
      ],
      artifacts: [
        cleanRoomEffect("lightning-arrow-ready", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Lightning Arrow: Ready",
          markerOnly: true,
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: whileSpellActive(),
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
  accepted: acceptance(EXPANSION_BATCH, [
    "bonus-action self cast 只消耗一个三环或更高法术位，并建立最长一分钟的 concentration 与 Lightning Arrow ready Effect",
    "持续期间下一次真实 ranged weapon attack 无论命中或未命中都只消费一次 ready；其他攻击类型不消费也不触发法术",
    "命中时以基础 4d8 lightning 替换父攻击的武器基础伤害，并保留其他独立 rider；每升一环增加 1d8，暴击扩骰交给 Midi",
    "未命中时目标承受同一主伤害公式向下取整的一半；不会错误结算武器普通伤害",
    "命中或未命中后都以攻击目标为中心快照 10 ft 内除攻击目标外的其他 creature；每个邻近目标分别进行 Dexterity save，失败承受基础 2d8 lightning、成功一半，每升一环增加 1d8",
    "邻域伤害不是父攻击的暴击伤害，不随父攻击暴击扩骰；同一次攻击 outcome 只产生一轮邻域结算",
    "ready 被消费后同步结束本次法术与专注；若一分钟到期或专注提前结束，后续 ranged weapon attack 不再触发",
  ], { status: "compiler-runtime-passed" }),
});

export default lightningArrows;
