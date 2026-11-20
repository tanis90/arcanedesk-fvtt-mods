import {
  acceptance,
  cleanRoomSpell,
  consume,
  dice,
  graphFragment,
  instant,
  operation,
  perSlotAboveBase,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 C 桶 recipe-invalid，c-dm）：2024 改为体质豁免、2d10 暗蚀半伤
// （2014 是近战法术攻击 3d10）；每环 +1d10 与触碰范围不变。
// 5R 锚点：玩家手册2024/法术详述/1环.htm#Inflict_Wounds。
const inflictWounds = cleanRoomSpell({
  id: "inflict-wounds",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "inflict-wounds-graph",
      actions: [publicAction("cast", "致伤术 Inflict Wounds")],
      rules: [
        rule({
          id: "cast-inflict-wounds",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
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
              id: "cast:damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(2, 10),
                dice(1, 10),
              ),
              damageTypes: ["necrotic"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    "docs/foundry-automation/notes/法术编译器clean-room实施计划.md",
    [
      "action 对触碰范围内一个声明目标要求 Constitution save",
      "豁免失败受到 2d10 necrotic damage，豁免成功受到一半；每升一环增加 1d10",
      "不再进行 melee spell attack，因此没有命中/未命中分支",
      "只消耗一个所声明环位的法术位",
    ],
    { status: "compiler-passed" },
  ),
});

export default inflictWounds;
