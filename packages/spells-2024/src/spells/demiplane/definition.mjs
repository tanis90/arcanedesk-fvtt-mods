import {
  QA_LOG,
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  graphFragment,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/8环.htm#Demiplane。
// 自动化等级：marker-only——DM 放置 5-ft 立方门标记；半位面房间、连接与滞留规则由 DM 执行。
const demiplane = cleanRoomSpell({
  id: "demiplane",
  contract: spellContract({
    ruleset: "2024",
    level: 8,
    school: "con",
    components: {
      verbal: false,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(1, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "门必须出现在施法者可见的一处平坦固体表面上；模板放置位置与该表面资格由 DM 确认",
      "半位面房间（30 尺立方、木质或石质）的创建、门的开关、每次施法新建或连向已创造的半位面，均由 DM 手动处理",
      "法术终止时门消失、内部物件留存、生物选择被抛出并陷入倒地的结算由 DM 执行，自动化只清理门标记",
    ],
  },
  fragments: [
    graphFragment({
      id: "demiplane-graph",
      actions: [publicAction("cast", "半位面 Demiplane")],
      artifacts: [
        artifact({
          id: "demiplane-door",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "cube", size: 5, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("demiplane-door-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Demiplane Door",
          markerOnly: true,
          lifecycle: whileArtifact("demiplane-door"),
        }),
      ],
      rules: [
        rule({
          id: "cast-demiplane",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cube",
              size: 5,
              range: 60,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-door",
              artifactId: "demiplane-door",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 在 60 ft 内一处可见平坦固体表面上放置 5-ft 立方，作为半位面之门标记；施法只消耗一个八环或更高法术位",
    "门标记最长持续一小时且不建立专注；替换或到期时清理标记",
    "进入立方区域的成员获得同名 Demiplane Door 成员 marker，仅作可见提示，不施加机制效果",
    "标记不创建半位面房间、不传送生物、不施加状态，也不运行任何豁免或伤害 workflow",
    "半位面内容、门的开关、连向既有半位面与终止时的滞留/抛出规则由 DM 按 5R 原文执行",
    "可见性与平坦固体表面的资格保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default demiplane;
