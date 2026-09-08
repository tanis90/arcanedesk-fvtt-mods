import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  duration,
  graphFragment,
  operation,
  perSlotAboveBase,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const aid = cleanRoomSpell({
  id: "aid",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(8, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "aid-graph",
      actions: [publicAction("cast", "援助术 Aid")],
      artifacts: [
        cleanRoomEffect("aid-instance", {
          host: "actor",
          scope: "cast-target",
          identityKeys: ["castUuid", "targetUuid"],
          reapply: "stack",
          name: "Aid",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-aid",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 3,
              range: 30,
              units: "ft",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("grant-hit-point-capacity", {
              id: "cast:grant-hit-point-capacity",
              target: "target:cast",
              artifactId: "aid-instance",
              formula: perSlotAboveBase(constant(5), constant(5)),
              stacking: "same-spell-strongest-latest",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    QA_LOG,
    [
      "唯一公开动作在 30 ft 内接受一至三个明确声明的生物目标，消耗一个已声明环位且不建立专注",
      "每个目标的当前生命值与有效生命上限在二环时同时增加 5，每升一环再增加 5；临时生命值不变",
      "每次施法为每个目标建立一个绑定施法来源且持续八小时的实例；实例失效时按有效账本差值同时回退当前生命与生命上限，保留期间承受的伤害或治疗，当前生命最低为 0，且这些变化不触发伤害或治疗语义",
      "同名援助术实例不叠加：数值最高者生效；较弱实例保留为休眠项，当前较强实例失效后恢复生效",
      "零个或四个目标必须在资源消耗和状态变化前被拒绝",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default aid;
