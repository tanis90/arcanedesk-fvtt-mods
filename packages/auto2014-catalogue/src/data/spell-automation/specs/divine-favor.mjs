import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  trigger,
  weaponHitDamageRider,
  whileSpellActive,
} from "../dsl.mjs";

const divineFavor = cleanRoomSpell({
  id: "divine-favor",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 6 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "divine-favor-graph",
      actions: [
        publicAction("cast", "神恩 Divine Favor", {
          activationType: "bonus",
        }),
      ],
      artifacts: [
        cleanRoomEffect("divine-favor", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Divine Favor",
          modifiers: [
            weaponHitDamageRider(dice(1, 4), "radiant"),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-divine-favor",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-divine-favor",
              artifactId: "divine-favor",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "bonus action 自体施法只消耗一个一环或更高法术位并建立专注",
    "持续期间近战与远程武器命中增加 1d4 radiant damage",
    "未命中不结算附加伤害",
    "专注结束或一分钟到期时移除 Divine Favor",
  ], { status: "compiler-runtime-passed" }),
});

export default divineFavor;
