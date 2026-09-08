import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  consume,
  dice,
  graphFragment,
  instant,
  operation,
  perSlotAboveBase,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

const fireball = cleanRoomSpell({
  id: "fireball",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "爆炸绕过拐角的传播规则不由当前二维球形模板额外计算，DM 排除被场景墙体几何错误包含或遗漏的目标",
      "区域内未被穿戴或携带的可燃物件点燃仍由 DM 结算",
    ],
  },
  fragments: [
    graphFragment({
      id: "fireball-graph",
      actions: [
        publicAction("cast", "火球术 Fireball"),
      ],
      rules: [
        rule({
          id: "cast-fireball",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "sphere",
              size: 20,
              range: 150,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["dex"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(8, 6),
                dice(1, 6),
              ),
              damageTypes: ["fire"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 在 150 ft 内放置 20-ft-radius sphere，并由同一 workflow 快照模板内 creature",
    "模板成员进行 Dexterity save；失败承受 8d6 fire damage，成功承受一半",
    "每升一环增加 1d6 fire damage，并且一次施法只消耗一个明确声明的法术位",
    "该瞬时区域不建立专注，也不留下持续模板",
    "绕角传播与可燃物件点燃保持明确 omission",
  ], { status: "compiler-runtime-passed" }),
});

export default fireball;
