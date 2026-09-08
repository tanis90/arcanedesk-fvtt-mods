import {
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

const L5_WAVE_I1_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wave-i1-qa-2026-08-26.md";

const coneOfCold = cleanRoomSpell({
  id: "cone-of-cold",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
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
      "被该法术击杀的生物变成冰冻雕像及其尸体外观、阻挡与环境后果由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "cone-of-cold-graph",
      actions: [publicAction("cast", "寒冰锥 Cone of Cold")],
      rules: [
        rule({
          id: "cast-cone-of-cold",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cone",
              size: 60,
              range: null,
              rangeUnits: "self",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["con"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(8, 8),
                dice(1, 8),
              ),
              damageTypes: ["cold"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L5_WAVE_I1_QA_RECEIPT, [
    "DM 从施法者位置确定一个 60-ft cone 的方向，并由同一 workflow 快照模板内 creature",
    "模板成员进行 Constitution save；失败承受 8d8 cold damage，成功承受一半",
    "每升一环增加 1d8 cold damage，并且一次施法只消耗一个明确声明的五环或更高法术位",
    "该瞬时区域不建立专注，也不留下持续模板；非目标保持不变",
    "冰冻雕像、尸体外观、阻挡与环境后果保持明确 DM omission，不被自动化冒充为已实现",
  ], { status: "compiler-runtime-passed" }),
});

export default coneOfCold;
