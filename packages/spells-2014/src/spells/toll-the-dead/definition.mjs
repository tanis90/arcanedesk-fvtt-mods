import {
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
  spellScript,
  spellScriptHandler,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

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
  emission: { contentVersion: 2 },
  support: {
    level: "simplified",
    omissions: [
      "目标必须能被施法者看见；当前 selected-targets 原语没有通用可见性校验，由 DM 在声明目标时判断",
    ],
  },
  script: spellScript("toll-the-dead", {
    version: 1,
    handlers: [spellScriptHandler("choose-damage-die", "damage-die-selection", {
      runtimeRuleId: "cast-toll-the-dead",
      authority: "damage-roll-caller",
      dedupe: "damage-roll-config",
      cleanupOwner: "source",
      writes: ["workflow:base-damage-die"],
      configuration: {schemaVersion: 1, allowedFaces: [8, 12]},
    })],
  }),
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
    "packages/spells-2014/README.md#cantrip-runtime-acceptance",
    [
      "60 ft 内一个由 DM 确认可见的声明目标进行 Wisdom save，且作为戏法不消耗法术位",
      "豁免成功不受伤害；豁免失败的未受伤目标承受 1d8 necrotic damage",
      "d8 分支在角色 5、11、17 级分别增加至 2d8、3d8、4d8",
      "目标普通 HP 小于最大 HP 时选择 d12，临时 HP 不影响骰型；沿用同一原生成长骰数，伤害类型与豁免结算保持不变",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default tollTheDead;
