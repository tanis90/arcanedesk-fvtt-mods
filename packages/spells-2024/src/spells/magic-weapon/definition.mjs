import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  castLevel,
  cleanRoomEffect,
  cleanRoomSpell,
  cleanRoomWeaponEnchantment,
  constant,
  consume,
  duration,
  grantMagicalWeapon,
  graphFragment,
  operation,
  ownedItem,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  tiers,
  trigger,
  weaponAttackAndDamageBonus,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 C 桶 recipe-invalid，c-dm）：2024 施法距离改为触碰、不再专注，
// 加值门槛改为 3 环起 +2（6 环 +3 不变）；附赠动作与一小时持续时间不变。
// 5R 锚点：玩家手册2024/法术详述/2环.htm#Magic_Weapon。
const magicWeaponBonus = tiers(
  [
    { minimum: 2, value: constant(1) },
    { minimum: 3, value: constant(2) },
    { minimum: 6, value: constant(3) },
  ],
  castLevel(),
);

const magicWeapon = cleanRoomSpell({
  id: "magic-weapon",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "自动选择施法者首件已装备的非魔法武器，不再询问要触碰哪一件武器",
      "当前 CLI 不支持为其他生物持有的武器施法",
      "2024 的触碰距离由 DM/CLI 保证；runtime 不校验目标武器与施法者的实际距离",
    ],
  },
  fragments: [
    graphFragment({
      id: "magic-weapon-graph",
      actions: [
        publicAction("cast", "魔化已装备武器 Magic Equipped Weapon", {
          activationType: "bonus",
        }),
      ],
      artifacts: [
        cleanRoomEffect("magic-weapon-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Magic Weapon: Active",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
        cleanRoomWeaponEnchantment("weapon-enchantment", {
          name: "Magic Weapon",
          modifiers: [
            grantMagicalWeapon(),
            weaponAttackAndDamageBonus(magicWeaponBonus),
          ],
          lifecycle: whileArtifact("magic-weapon-source"),
        }),
      ],
      rules: [
        rule({
          id: "cast-magic-weapon",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            self("target:cast"),
            ownedItem("target:weapon", {
              itemType: "weapon",
              equipped: true,
              magical: false,
              selection: "first-stable",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-source",
              artifactId: "magic-weapon-source",
              target: "source",
            }),
            operation("create-artifact", {
              id: "cast:enchant-weapon",
              artifactId: "weapon-enchantment",
              target: "target:weapon",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "bonus-action 施法触碰一件非魔法武器（当前 CLI 稳定选择施法者首件已装备的非魔法武器）",
      "二环提供 +1、三至五环提供 +2、六环及以上提供 +3 武器攻击与伤害加值，并将目标视为魔法武器",
      "施法只消耗一个所声明环位的法术位；2024 起不建立专注",
      "效果持续一小时；重施时 replace 旧附魔，武器不会叠出两个加值",
      "结束或到期时由 dnd5e dependent lifecycle 只删除本次施法的 weapon enchantment，武器精确恢复且不遗留加值",
      "不自动选择其他生物持有的武器，也不在多件合格武器之间追问施法者",
    ],
    { status: "compiler-passed" },
  ),
});

export default magicWeapon;
