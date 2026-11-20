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

// L4 移植批（非 SRD，spells24 无源文档）：G 桶 + 2014 recipe conjure-barrage。
// 5R 锚点 三环.htm#Conjure_Barrage。与 2014 差异：伤害由 3d8 穿刺改为 5d8 力场、新增升环 +1d8、材料改为价值 1+CP 的近战或远程武器、中文名召唤箭雨→箭如雨下。
const conjureBarrage = cleanRoomSpell({
  id: "conjure-barrage",
  contract: spellContract({
    ruleset: "2024",
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
      "5R 允许你从 60-ft cone 内自选你可见的目标；runtime 快照模板内全部 creature，不希望被波及的生物需由 DM 在结算前从目标列表剔除",
      "材料武器不自动校验「价值 1+CP 的近战或远程武器」；DM 需在施法前确认所持武器合格，系统不读取物品价格",
    ],
  },
  fragments: [
    graphFragment({
      id: "conjure-barrage-graph",
      actions: [
        publicAction("cast", "箭如雨下 Conjure Barrage"),
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
              formula: perSlotAboveBase(
                dice(5, 8),
                dice(1, 8),
              ),
              damageTypes: ["force"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 从施法者位置确定一个 60-ft cone 的方向，并由同一 workflow 快照模板内 creature",
    "模板成员进行 Dexterity save；失败承受 5d8 force damage，成功承受一半",
    "每比三环高一环，伤害增加 1d8；一次施法只消耗一个明确声明的三环或更高法术位",
    "该瞬时区域不建立专注，也不留下持续模板",
    "目标筛选（由你选择且你可见）与材料武器价值校验保持为明确 DM 边界",
  ], { status: "compiler-passed" }),
});

export default conjureBarrage;
