import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
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
} from "@arcanedesk/spell-compiler/dsl";

// 2024 重写批（M1.0 审计 A 桶 desc-diff-flag）：2024 改为每个剩余分身各掷 d6、
// 任一 ≥3 即由一个分身代受命中（删去 2014 的分身 AC=10+敏捷调整值）。
// 5R 锚点：5R 玩家手册2024 2环.htm#Mirror_Image。
const mirrorImage = cleanRoomSpell({
  id: "mirror-image",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "ill",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "minutes")),
  }),
  emission: { contentVersion: 7 },
  support: {
    level: "simplified",
    omissions: [
      "三个分身的剩余计数、每次命中时按剩余分身逐个掷 d6、任一 ≥3 时代受命中并摧毁一个分身，均由 DM 处理；本定义只建立一分钟的可见 marker",
      "目盲、盲视或真实视觉的攻击者不受本法术影响这一条件未自动化，由 DM 判断",
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
  accepted: acceptance(QA_LOG, [
    "self cast 只消耗一个二环或更高法术位且不建立专注",
    "施法者获得一个持续一分钟的可见 Mirror Image marker",
    "重复施法刷新或替换 marker，而不是堆叠重复效果",
    "2024 的分身替换机制（逐分身 d6 ≥3）不进入 marker：marker 不修改 AC、攻击目标、命中或伤害",
    "目盲/盲视/真实视觉攻击者无视本法术的条件由 DM 判断",
  ], { status: "compiler-passed" }),
});

export default mirrorImage;
