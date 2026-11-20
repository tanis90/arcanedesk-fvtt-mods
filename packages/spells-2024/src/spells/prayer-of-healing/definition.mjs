import {
  QA_LOG,
  acceptance,
  action,
  activation,
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

// 2024 重写批（M1.0 审计 C 桶 recipe-invalid）：治疗量由 2d8+施法属性改为固定
// 2d8，目标数 6→5，并新增"获得一次短休增益"，学派塑能→防护。
// 5R 锚点：5R 玩家手册2024 2环.htm#Prayer_of_Healing。
const prayerOfHealing = cleanRoomSpell({
  id: "prayer-of-healing",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "abj",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 7 },
  support: {
    level: "simplified",
    omissions: [
      "5R 的「等同于一次短休的增益」（可花费生命骰恢复等）未自动化，由 DM 在短休流程中处理",
      "一名生物直到完成一次长休为止不能再次被此法术影响：系统不记录该长休冷却，由 DM 判断",
      "10 分钟施法期间的世界时间推进、中断，以及「施法期间始终位于 30 ft 内」的资格由 DM 判断",
    ],
  },
  fragments: [
    graphFragment({
      id: "prayer-of-healing-graph",
      actions: [
        action({
          id: "cast",
          name: "治疗祷言 Prayer of Healing",
          activation: activation("minute", 10),
          visibility: "public",
        }),
      ],
      rules: [
        rule({
          id: "cast-prayer-of-healing",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 5,
              range: 30,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("healing", {
              id: "cast:healing",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(2, 8),
                dice(1, 8),
              ),
              healingTypes: ["healing"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "10 分钟施法选择 30 ft 内一至五个 creature，只消耗一个二环或更高法术位",
    "每个目标恢复 2d8 点生命值（2024 起不再加施法属性调整值），每比二环高一环增加 1d8",
    "5R 新增的短休增益、每长休一次的冷却与施法期间的空间资格由 DM 处理",
    "非目标 HP 不变，不建立专注或持续 Effect",
  ], { status: "compiler-passed" }),
});

export default prayerOfHealing;
