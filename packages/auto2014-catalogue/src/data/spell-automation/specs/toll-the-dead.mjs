import {
  QA_LOG,
  acceptance,
  cantripProgression,
  cleanRoomSpell,
  dice,
  graphFragment,
  instant,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "../dsl.mjs";

const tollTheDead = cleanRoomSpell({
  id: "toll-the-dead",
  contract: spellContract({
    ruleset: "2014",
    level: 0,
    school: "nec",
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
      "目标已失去至少 1 HP 时应改用 d12 伤害骰；现有 predicate 与值表达式不能依据目标当前 HP 是否低于最大 HP 选择伤害公式，因此当前保守使用未受伤目标的 d8 分支",
      "目标必须能被施法者看见；当前 selected-targets 原语没有通用可见性校验，由 DM 在声明目标时判断",
    ],
  },
  fragments: [
    graphFragment({
      id: "toll-the-dead-graph",
      actions: [publicAction("cast", "亡者丧钟 Toll the Dead")],
      rules: [
        rule({
          id: "cast-toll-the-dead",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 60,
              kind: "creature",
            }),
          ],
          do: [
            operation("saving-throw", {
              id: "cast:save",
              ability: ["wis"],
              target: "target:cast",
              onSave: "none",
            }),
            operation("damage", {
              id: "cast:damage",
              target: "target:cast",
              formula: cantripProgression(
                dice(1, 8),
                dice(1, 8),
              ),
              damageTypes: ["necrotic"],
              onSave: "none",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    QA_LOG,
    [
      "60 ft 内一个由 DM 确认可见的声明目标进行 Wisdom save，且作为戏法不消耗法术位",
      "豁免成功不受伤害；豁免失败的未受伤目标承受 1d8 necrotic damage",
      "d8 分支在角色 5、11、17 级分别增加至 2d8、3d8、4d8",
      "目标已受伤时应使用的 d12 分支保持明确 omission，不把无法判定的目标默认按 d12 过量结算",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default tollTheDead;
