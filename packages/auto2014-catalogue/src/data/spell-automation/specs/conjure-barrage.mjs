import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  consume,
  dice,
  graphFragment,
  instant,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
} from "../dsl.mjs";

const conjureBarrage = cleanRoomSpell({
  id: "conjure-barrage",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "con",
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
      "法术伤害类型应与作为材料的一发非魔法弹药或一把非魔法投掷武器相同；当前 DSL 没有“材料物件伤害类型”表达式，产物暂按最常见的 piercing damage 结算，DM 在使用其他材料时调整伤害类型",
    ],
  },
  fragments: [
    graphFragment({
      id: "conjure-barrage-graph",
      actions: [
        publicAction("cast", "召唤箭雨 Conjure Barrage"),
      ],
      rules: [
        rule({
          id: "cast-conjure-barrage",
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
              ability: ["dex"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-damage",
              target: "target:cast",
              formula: dice(3, 8),
              damageTypes: ["piercing"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 从施法者位置确定一个 60-ft cone 的方向，并由同一 workflow 快照模板内 creature",
    "模板成员进行 Dexterity save；失败承受 3d8 damage，成功承受一半",
    "该法术没有升环伤害条款：使用四环或更高环位时仍造成 3d8，并且一次施法只消耗一个明确声明的法术位",
    "该瞬时区域不建立专注，也不留下持续模板",
    "伤害类型当前默认 piercing；材料为其他伤害类型的弹药或投掷武器时由 DM 调整",
  ], { status: "compiler-runtime-passed" }),
});

export default conjureBarrage;
