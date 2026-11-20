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
  operation,
  perSlotAboveBase,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 C 桶 recipe-invalid，c-dm）：5R 为 2d4+4 且持续时间立即，
// 2014 是 1d4+4 并挂一小时来源 marker；2024 没有需要清理的残留效果。
// 5R 锚点：玩家手册2024/法术详述/1环.htm#False_Life。
const falseLife = cleanRoomSpell({
  id: "false-life",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "nec",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "false-life-graph",
      actions: [publicAction("cast", "虚假生命 False Life")],
      rules: [
        rule({
          id: "cast-false-life",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("healing", {
              id: "cast:temporary-hp",
              target: "target:cast",
              formula: perSlotAboveBase(
                add(dice(2, 4), constant(4)),
                constant(5),
              ),
              healingTypes: ["temphp"],
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "self cast 只消耗一个法术位并获得 2d4 + 4 temporary HP（2024 骰面）",
    "每升一环额外获得 5 temporary HP",
    "2024 持续时间为立即：不建立来源 marker、不留下待清理效果，临时生命值按通用规则消耗至耗尽或被更高值替换",
    "该法术不建立专注",
  ], { status: "compiler-passed" }),
});

export default falseLife;
