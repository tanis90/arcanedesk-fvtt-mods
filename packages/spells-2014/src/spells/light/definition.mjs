import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  contentRef,
  duration,
  graphFragment,
  minimumTokenLight,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const light = cleanRoomSpell({
  id: "light",
  contract: spellContract({
    ruleset: "2014",
    level: 0,
    school: "evo",
    components: {
      verbal: true,
      somatic: false,
      material: true,
    },
    material: {
      cost: 0,
      consumed: false,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  content: contentRef("light"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "物件目标简化为施法者携带的光源，公开 action 使用 self；需要把光源留在场景中的独立物件时由 DM 手动放置光源",
      "对敌对生物持有或穿戴物件施法时的 Dexterity save 不自动执行",
      "光照颜色选择与用不透明物体完全遮住光源的临时熄灭由 DM 手动处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "light-graph",
      actions: [publicAction("cast", "光亮术 Light")],
      artifacts: [
        cleanRoomEffect("light", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Light",
          modifiers: [
            minimumTokenLight(constant(20), constant(40)),
          ],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-light",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            operation("apply-artifact", {
              id: "cast:apply-light",
              artifactId: "light",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "公开 action 以 self 输入建立一个随施法者 Token 移动的 Light 效果，且戏法不消耗法术位、不建立专注",
    "效果通过 ATL minimum light 提供至少 20 ft bright / 40 ft dim，原有更强光源不会被降低",
    "效果持续一小时；同一来源重施时 replace 旧效果而不叠加",
    "移除或到期后恢复施法前的 Token 光照 baseline，非目标与其他效果不变",
    "物件级选择、敌对持有物 Dexterity save、颜色与遮光保持明确 omission",
  ], { status: "compiler-runtime-passed" }),
});

export default light;
