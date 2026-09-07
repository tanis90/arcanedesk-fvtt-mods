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
} from "../dsl.mjs";

const lightningBolt = cleanRoomSpell({
  id: "lightning-bolt",
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
      "区域内未被穿戴或携带的可燃物件点燃仍由 DM 结算",
    ],
  },
  fragments: [
    graphFragment({
      id: "lightning-bolt-graph",
      actions: [
        publicAction("cast", "闪电束 Lightning Bolt"),
      ],
      rules: [
        rule({
          id: "cast-lightning-bolt",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "line",
              size: 100,
              width: 5,
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
                dice(8, 6),
                dice(1, 6),
              ),
              damageTypes: ["lightning"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 从施法者位置确定一条 100-ft-long、5-ft-wide line，并由同一 workflow 快照模板内 creature",
    "模板成员进行 Dexterity save；失败承受 8d6 lightning damage，成功承受一半",
    "每升一环增加 1d6 lightning damage，并且一次施法只消耗一个明确声明的法术位",
    "该瞬时区域不建立专注，也不留下持续模板",
    "可燃物件点燃保持明确 omission",
  ], { status: "compiler-runtime-passed" }),
});

export default lightningBolt;
