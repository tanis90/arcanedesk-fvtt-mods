import {
  QA_LOG,
  acceptance,
  add,
  cleanRoomSpell,
  constant,
  consume,
  dice,
  graphFragment,
  instant,
  independentProjectiles,
  operation,
  perSlotAboveBase,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "../dsl.mjs";

const magicMissile = cleanRoomSpell({
  id: "magic-missile",
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
      "每枚飞弹按独立 child workflow 依次掷 1d4 + 1；当前不共享同一次 d4 结果，也不模拟规则文本中的严格同时命中",
      "每个目标必须能被施法者看见；当前 selected-targets 原语没有通用可见性校验，由 DM 在声明目标时判断",
    ],
  },
  fragments: [
    graphFragment({
      id: "magic-missile-graph",
      actions: [
        publicAction("cast", "魔法飞弹 Magic Missile", {
          resolution: independentProjectiles(
            perSlotAboveBase(constant(3), constant(1)),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-magic-missile",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 120,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("damage", {
              id: "cast:damage",
              target: "target:cast",
              formula: add(dice(1, 4), constant(1)),
              damageTypes: ["force"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 只声明一个 120 ft 内的 creature 时，默认将全部飞弹集中到该目标；agent 不自行选择第二目标",
    "飞弹自动命中，不进行 attack roll 或 saving throw",
    "一环执行三次独立的 1d4 + 1 force damage；每升一环增加一次飞弹结算",
    "一次施法只消耗一个 DM 明确声明环位的法术位",
    "只有 DM 明确逐弹分配时才读取 optional allocation；字段缺失时必须保持单目标集中策略",
    "每枚飞弹及其分配结果都有独立 workflow，可从机器状态验证",
    "目标可见性由 DM 在声明目标时判断，不误报为自动校验",
    "验收按已声明简化口径检查逐枚顺序结算，不把共享 d4 或严格同时性误报为已实现",
  ], { status: "compiler-runtime-passed" }),
});

export default magicMissile;
