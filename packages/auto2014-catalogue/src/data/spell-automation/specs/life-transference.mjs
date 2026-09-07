import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomSpell,
  constant,
  consume,
  contentRef,
  dice,
  graphFragment,
  instant,
  multiply,
  operation,
  operationResult,
  perSlotAboveBase,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "../dsl.mjs";

const lifeTransference = cleanRoomSpell({
  id: "life-transference",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  content: contentRef("life-transference"),
  emission: { contentVersion: 5 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "life-transference-graph",
      actions: [publicAction("cast", "生命转换 Life Transference")],
      rules: [
        rule({
          id: "cast-life-transference",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:recipient", {
              min: 1,
              max: 1,
              range: 30,
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("damage", {
              id: "cast:self-damage",
              target: "source",
              formula: perSlotAboveBase(
                dice(4, 8),
                dice(1, 8),
              ),
              damageTypes: ["necrotic"],
              mitigation: "none",
            }),
            operation("healing", {
              id: "cast:recipient-healing",
              target: "target:recipient",
              formula: multiply(
                constant(2),
                operationResult("cast:self-damage", {
                  value: "rolled-amount",
                }),
              ),
              healingTypes: ["healing"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "action 选择 30 ft 内一个治疗接收者，并只消耗一个三环或更高法术位",
      "施法者承受不可被抗性、免疫或其他减伤降低的 4d8 necrotic damage",
      "声明目标恢复同次自伤已结算掷骰结果的两倍；该数值不按施法者剩余 HP 截断，其他 token 不变",
      "每升一环自伤增加 1d8，治疗继续引用同一次自伤掷骰并乘以二",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default lifeTransference;
