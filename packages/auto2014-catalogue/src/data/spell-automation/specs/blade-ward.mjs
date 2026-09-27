import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  duration,
  graphFragment,
  grantWeaponAttackDamageResistance,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
  untilTrigger,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const bladeWard = cleanRoomSpell({
  id: "blade-ward",
  contract: spellContract({
    ruleset: "2014",
    level: 0,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "rounds")),
  }),
  emission: { contentVersion: 1 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "blade-ward-graph",
      actions: [publicAction("cast", "剑刃防护 Blade Ward")],
      artifacts: [
        cleanRoomEffect("blade-ward", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Blade Ward",
          modifiers: [
            grantWeaponAttackDamageResistance([
              "bludgeoning",
              "piercing",
              "slashing",
            ]),
          ],
          lifecycle: untilTrigger(
            trigger("turn-end", {
              subject: "source",
              occurrence: "next-after-created",
            }),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-blade-ward",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            operation("apply-artifact", {
              id: "cast:apply-blade-ward",
              artifactId: "blade-ward",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "action self cast 建立一个 Blade Ward 效果，且戏法不消耗法术位、不建立专注",
    "效果只令武器攻击造成的 bludgeoning、piercing 与 slashing 伤害获得抗性；同一命中的其他伤害类型仍按原值结算",
    "魔法与非魔法武器攻击均满足条件；法术攻击、非武器能力及其他非武器来源的同类型伤害不满足条件",
    "效果持续覆盖施法者下一回合，直至该回合结束；期间可减免多次符合条件的武器攻击且不会因首次命中提前消费",
    "对自身重施时 replace 原效果而不叠加，移除或到期后精确恢复施法前的伤害抗性 baseline",
    "未命中、非目标以及不符合武器攻击来源条件的伤害不会产生额外状态变化",
  ], { status: "compiler-runtime-passed" }),
});

export default bladeWard;
