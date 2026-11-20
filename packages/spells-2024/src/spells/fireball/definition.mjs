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

// L2 重写批（M1.0 审计 A/B 桶 desc-diff-flag）：2024 删去「火焰绕过拐角扩散」，
// 区域变为普通 20 尺球形；8d6、敏捷半伤、升环 +1d6 不变。
// 5R 锚点：玩家手册2024/法术详述/3环.htm#Fireball。
const fireball = cleanRoomSpell({
  id: "fireball",
  contract: spellContract({
    ruleset: "2024",
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
      "区域按二维球形模板取成员；墙体与立体几何造成的目标取舍由 DM 校正，2024 已没有绕角扩散条款",
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
    "2024 没有绕角扩散条款，模板只按可见球形范围取成员；可燃物件点燃保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default fireball;
