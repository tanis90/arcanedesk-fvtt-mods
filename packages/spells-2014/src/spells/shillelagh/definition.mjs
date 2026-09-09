import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  cleanRoomWeaponEnchantment,
  dice,
  duration,
  graphFragment,
  grantMagicalWeapon,
  operation,
  ownedItem,
  publicAction,
  replaceWeaponBaseDamageDie,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
  useSpellcastingAbilityForWeaponAttacks,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const shillelagh = cleanRoomSpell({
  id: "shillelagh",
  contract: spellContract({
    ruleset: "2014",
    level: 0,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 0,
      consumed: false,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "自动选择施法者首件已装备的 club 或 quarterstaff，不在多件合法武器之间询问施法者",
      "当前 Actor Item 查询只支持施法者自己的已装备武器，不支持触碰其他生物持有的武器",
      "放开武器时立即结束法术仍由 DM 处理；重施、持续时间到期和来源效果替换会自动清理旧附魔",
      "武器攻击 rider 使用 dnd5e 的 spellcasting 占位符并由 Actor 当前默认施法属性解析；多施法属性角色若本法术来源属性不同于 Actor 默认值，由 DM 调整",
    ],
  },
  fragments: [
    graphFragment({
      id: "shillelagh-graph",
      actions: [
        publicAction("cast", "橡棍术 Shillelagh", {
          activationType: "bonus",
        }),
      ],
      artifacts: [
        cleanRoomEffect("shillelagh-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Shillelagh",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
        cleanRoomWeaponEnchantment("shillelagh-enchantment", {
          name: "Shillelagh",
          modifiers: [
            grantMagicalWeapon(),
            replaceWeaponBaseDamageDie(dice(1, 8)),
            useSpellcastingAbilityForWeaponAttacks(),
          ],
          lifecycle: whileArtifact("shillelagh-source"),
        }),
      ],
      rules: [
        rule({
          id: "cast-shillelagh",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            self("target:cast"),
            ownedItem("target:weapon", {
              itemType: "weapon",
              equipped: true,
              baseItems: ["club", "quarterstaff"],
              selection: "first-stable",
            }),
          ],
          do: [
            operation("apply-artifact", {
              id: "cast:apply-source",
              artifactId: "shillelagh-source",
              target: "source",
            }),
            operation("create-artifact", {
              id: "cast:enchant-weapon",
              artifactId: "shillelagh-enchantment",
              target: "target:weapon",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "bonus-action self cast 不消耗法术位，并按 sort、name、id 稳定选择首件已装备的 club 或 quarterstaff；没有合法武器时在任何世界状态变化前拒绝",
    "被选武器的基础伤害骰变为 1d8，并被视为魔法武器；其他武器不改变",
    "附魔把武器现有 attack activities 的能力覆盖为 dnd5e Actor 默认施法属性，攻击和伤害均不再依赖 Strength",
    "同一来源重施时先替换 source artifact 并清理旧武器的 dependent enchantment；一分钟到期也精确恢复原武器",
    "放开武器的即时终止边界明确保留给 DM，不误报为自动追踪",
  ], { status: "compiler-runtime-passed" }),
});

export default shillelagh;
