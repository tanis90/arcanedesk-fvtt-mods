import {
  QA_LOG,
  acceptance,
  cleanRoomSpell,
  consume,
  graphFragment,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/7环.htm#Divine_Word。
// 自动化等级：30 ft 内指定生物的 Charisma 豁免；按当前 HP 分档的状态/死亡与位面遣返由 DM 结算。
const divineWord = cleanRoomSpell({
  id: "divine-word",
  contract: spellContract({
    ruleset: "2024",
    level: 7,
    school: "evo",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "豁免失败者按当前生命值分档的效应（0~20 死亡；21~30 目盲、耳聋、震慑 1 小时；31~40 目盲、耳聋 10 分钟；41~50 耳聋 1 分钟）依赖逐目标 HP 阈值分支，现有 DSL 没有 HP 读取条件，由 DM 按 5R 圣言效应表结算",
      "天族、元素、妖精、邪魔即使生命值不低于 50，豁免失败也会被遣返回起源位面，并在 24 小时内不能返回（除非通过祈愿术）：由 DM 结算",
      "「施法距离内所有由你指定的生物」：selected-targets 只记录声明目标，不校验可见性或豁免资格",
      "「生命值低于 50」的判定由 DM 按目标当前 HP 复核",
    ],
  },
  fragments: [
    graphFragment({
      id: "divine-word-graph",
      actions: [
        publicAction("cast", "圣言术 Divine Word", {
          activationType: "bonus",
        }),
      ],
      rules: [
        rule({
          id: "cast-divine-word",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: "any",
              range: 30,
              units: "ft",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "cast:save",
              ability: ["cha"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "bonus action 对 30 ft 内所有被指定的生物各进行一次 Charisma save，只消耗一个七环或更高法术位",
    "施法产生聊天卡并记录每个目标的豁免结果；不创建持续 Effect、不建立专注",
    "豁免失败目标的 HP 分档效应（死亡 / 目盲耳聋震慑 / 目盲耳聋 / 耳聋）与持续时间由 DM 按 5R 表执行",
    "天族、元素、妖精、邪魔的位面遣返与 24 小时禁返由 DM 执行",
    "豁免成功者与非目标不受影响",
  ], { status: "compiler-passed" }),
});

export default divineWord;
