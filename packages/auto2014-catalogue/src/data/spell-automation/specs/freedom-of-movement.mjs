import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const freedomOfMovement = cleanRoomSpell({
  id: "freedom-of-movement",
  contract: spellContract({
    ruleset: "2014",
    level: 4,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "困难地形的额外移动消耗由 DM 忽略；marker 不修改 Foundry movement cost 或 movement speed",
      "法术与其他魔法效果造成的速度降低由 DM 否决或手动恢复；marker 不提供无来源区分的速度下限",
      "仅由法术或其他魔法效果造成的 paralyzed 与 restrained 由 DM 否决或手动清理；marker 不授予会同时阻止非魔法来源的 condition immunity",
      "水下环境对移动与攻击造成的惩罚由 DM 忽略；marker 不创建游泳速度，也不改写攻击 workflow",
      "目标花费 5 ft 移动力自动挣脱非魔法束缚由 DM 执行并移动 token",
    ],
  },
  fragments: [
    graphFragment({
      id: "freedom-of-movement-graph",
      actions: [publicAction("cast", "行动自如 Freedom of Movement")],
      artifacts: [
        cleanRoomEffect("freedom-of-movement", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Freedom of Movement",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-freedom-of-movement",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
              predicates: [predicate("willing")],
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-freedom-of-movement",
              artifactId: "freedom-of-movement",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 接触一个由 DM 声明为 willing 的 creature，只消耗一个四环或更高法术位；willing predicate 仅记录声明，不替 DM 推断意愿",
    "目标只获得具有独立 source-target identity 的 Freedom of Movement marker；marker 没有 status、condition immunity、movement modifier 或其他伪机械保护",
    "效果固定持续一小时且不建立专注；到期时删除本来源 marker，同一来源对同一目标重施只 replace 自己，其他来源实例不变",
    "困难地形、魔法减速、仅魔法造成的 paralyzed/restrained、水下移动与攻击，以及花费 5 ft 挣脱非魔法束缚全部保持明确 DM omission",
    "marker 只提醒 DM 执行上述规则，不代表 Foundry 已自动忽略移动成本、恢复速度、阻止状态、修正水下攻击或完成挣脱移动",
  ], { status: "compiler-runtime-passed" }),
});

export default freedomOfMovement;
