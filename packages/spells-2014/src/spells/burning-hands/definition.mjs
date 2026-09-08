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

const burningHands = cleanRoomSpell({
  id: "burning-hands",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "法术点燃区域内未被着装或携带的可燃物件仍由 DM 结算",
    ],
  },
  fragments: [
    graphFragment({
      id: "burning-hands-graph",
      actions: [
        publicAction("cast", "燃烧之手 Burning Hands"),
      ],
      rules: [
        rule({
          id: "cast-burning-hands",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cone",
              size: 15,
              range: null,
              rangeUnits: "self",
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
                dice(3, 6),
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
    "DM 从施法者位置确定一个 15-ft cone 的方向，并由同一 workflow 快照模板内 creature",
    "模板成员进行 Dexterity save；失败承受 3d6 fire damage，成功承受一半",
    "每升一环增加 1d6 fire damage，并且一次施法只消耗一个明确声明的法术位",
    "该瞬时区域不建立专注，也不留下持续模板",
    "可燃物件点燃保持明确 omission",
  ], { status: "compiler-runtime-passed" }),
});

export default burningHands;
