import {
  QA_LOG,
  acceptance,
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

const scorchingRay = cleanRoomSpell({
  id: "scorching-ray",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "evo",
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
      id: "scorching-ray-graph",
      actions: [
        publicAction("cast", "灼热射线 Scorching Ray", {
          resolution: independentProjectiles(
            perSlotAboveBase(constant(3), constant(1)),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-scorching-ray",
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
            operation("attack-roll", {
              id: "cast:attack",
              target: "target:cast",
              attack: {
                source: "spellcasting",
                range: "ranged",
              },
            }),
            operation("damage", {
              id: "cast:damage",
              target: "target:cast",
              formula: dice(2, 6),
              damageTypes: ["fire"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 只声明一个 120 ft 内的 creature 时，默认将全部射线集中到该目标；agent 不自行选择第二目标",
    "二环执行三次独立 ranged spell attack workflow，且每升一环新增一次；每条未命中不造成伤害",
    "每条命中造成 2d6 fire damage，暴击由 Midi 独立处理",
    "一次施法只消耗一个 DM 明确声明环位的法术位",
    "只有 DM 明确逐射线分配时才读取 optional allocation；字段缺失时必须保持单目标集中策略",
  ], { status: "compiler-runtime-passed" }),
});

export default scorchingRay;
