import {
  acceptance,
  castLevel,
  cleanRoomSpell,
  cleanRoomWeaponEnchantment,
  concentration,
  constant,
  consume,
  dice,
  duration,
  graphFragment,
  grantMagicalWeapon,
  operation,
  ownedItem,
  parameterValue,
  publicAction,
  requiredEnumSelection,
  rule,
  self,
  spellContract,
  tiers,
  trigger,
  weaponAttackBonus,
  weaponHitDamageRider,
  whileArtifact,
} from "@arcanedesk/spell-compiler/dsl";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const damageTypes = [
  { id: "acid", label: "强酸 Acid" },
  { id: "cold", label: "寒冷 Cold" },
  { id: "fire", label: "火焰 Fire" },
  { id: "lightning", label: "闪电 Lightning" },
  { id: "thunder", label: "雷鸣 Thunder" },
];

const elementalAttackBonus = tiers(
  [
    { minimum: 3, value: constant(1) },
    { minimum: 5, value: constant(2) },
    { minimum: 7, value: constant(3) },
  ],
  castLevel(),
);

const elementalDamage = tiers(
  [
    { minimum: 3, value: dice(1, 4) },
    { minimum: 5, value: dice(2, 4) },
    { minimum: 7, value: dice(3, 4) },
  ],
  castLevel(),
);

const elementalWeapon = cleanRoomSpell({
  id: "elemental-weapon",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "自动选择施法者首件已装备的非魔法武器，不在多件合法武器之间询问施法者",
      "当前 CLI 不支持为其他生物持有的武器施法",
    ],
  },
  fragments: [
    graphFragment({
      id: "elemental-weapon-graph",
      actions: [
        publicAction("cast", "元素武器 Elemental Weapon", {
          activationType: "action",
          parameters: [
            requiredEnumSelection(
              "damageType",
              damageTypes.map(damageType => damageType.id),
              {
                labels: Object.fromEntries(
                  damageTypes.map(damageType => [
                    damageType.id,
                    damageType.label,
                  ]),
                ),
              },
            ),
          ],
        }),
      ],
      artifacts: [
        cleanRoomWeaponEnchantment("elemental-weapon-enchantment", {
          name: "Elemental Weapon",
          modifiers: [
            grantMagicalWeapon(),
            weaponAttackBonus(elementalAttackBonus),
            weaponHitDamageRider(
              elementalDamage,
              parameterValue("damageType"),
            ),
          ],
          lifecycle: whileArtifact("concentration"),
        }),
      ],
      rules: [
        rule({
          id: "cast-elemental-weapon",
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
              artifactId: "elemental-weapon-enchantment",
              target: "target:weapon",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "同一个 action 要求 DM 明确提供 acid、cold、fire、lightning 或 thunder；缺失、非法或未知 selection 在 workflow、法术位和专注变化前拒绝",
    "稳定选择施法者首件已装备的非魔法武器；没有合法武器时零副作用拒绝，其他武器不改变",
    "三至四环提供 +1 attack 与所选类型 1d4 命中附伤；五至六环为 +2 与 2d4；七环及以上为 +3 与 3d4",
    "武器在持续期间被视为魔法武器；额外伤害只在真实命中时结算，暴击扩骰交给 Midi",
    "一次合法施法只消耗一个明确声明环位的法术位并建立最长一小时专注",
    "结束、替换或到期结束专注时由 dnd5e dependent lifecycle 精确删除本次附魔，并恢复武器原有攻击与伤害数据",
  ], { status: "compiler-runtime-passed" }),
});

export default elementalWeapon;
