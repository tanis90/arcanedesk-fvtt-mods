import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  castLevel,
  cleanRoomSpell,
  cleanRoomWeaponEnchantment,
  concentration,
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
  tiers,
  trigger,
  weaponAttackAndDamageBonus,
  whileArtifact,
} from "../dsl.mjs";

const magicWeaponBonus = tiers(
  [
    { minimum: 2, value: constant(1) },
    { minimum: 4, value: constant(2) },
    { minimum: 6, value: constant(3) },
  ],
  castLevel(),
);

const magicWeapon = cleanRoomSpell({
  id: "magic-weapon",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  emission: { contentVersion: 6 },
  support: {
    level: "simplified",
    omissions: [
      "自动选择施法者首件已装备的非魔法武器，不再询问要触碰哪一件武器",
      "当前 CLI 不支持为其他生物持有的武器施法",
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
        cleanRoomWeaponEnchantment("weapon-enchantment", {
          name: "Magic Weapon",
          modifiers: [
            grantMagicalWeapon(),
            weaponAttackAndDamageBonus(magicWeaponBonus),
          ],
          lifecycle: whileArtifact("concentration"),
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
      "bonus-action self cast 稳定选择施法者首件已装备的非魔法武器，不要求 CLI 传递额外参数",
      "二至三环提供 +1、四至五环提供 +2、六环及以上提供 +3 武器攻击与伤害加值，并将目标视为魔法武器",
      "施法只消耗一个所声明环位的法术位，并建立最长一小时的专注",
      "结束或替换专注时由 dnd5e dependent lifecycle 只删除本次施法对应的 weapon enchantment，武器精确恢复且不遗留加值",
      "不自动选择其他生物持有的武器，也不在多件合格武器之间追问施法者",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default magicWeapon;
