import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  contentRef,
  consume,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const mirrorImage = cleanRoomSpell({
  id: "mirror-image",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "ill",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
  }),
  content: contentRef("mirror-image"),
  emission: { contentVersion: 6 },
  support: {
    level: "simplified",
    omissions: [
      "攻击重定向、复制体 AC、三份镜像计数与逐次消耗由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "mirror-image-marker-graph",
      actions: [publicAction("cast", "镜影术 Mirror Image")],
      artifacts: [
        cleanRoomEffect("mirror-image-marker", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Mirror Image",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-mirror-image",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "mirror-image-marker",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "self cast 只消耗一个二环法术位且不建立专注",
    "施法者获得一个持续一分钟的可见 Mirror Image marker",
    "重复施法刷新或替换 marker，而不是堆叠重复效果",
    "marker 不修改 AC、攻击目标、命中或伤害",
  ], { status: "compiler-runtime-passed" }),
});

export default mirrorImage;
