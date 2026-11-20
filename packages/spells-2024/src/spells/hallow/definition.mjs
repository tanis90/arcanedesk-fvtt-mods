import {
  QA_LOG,
  acceptance,
  action,
  activation,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  graphFragment,
  manual,
  operation,
  placedTemplate,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  whileArtifact,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/5环.htm#Hallow。
// 自动化等级：utility marker-only——24 小时施法放置半径 60 ft 的固定区域；守卫与额外效应由 DM 执行。
const hallow = cleanRoomSpell({
  id: "hallow",
  contract: spellContract({
    ruleset: "2024",
    level: 5,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 1000,
      consumed: true,
    },
    lifetime: spellLifetime(),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "「直至被解除」无法写入 contract lifetime（只接受 instant 或固定 duration）：contract 记为立即，圣居区域使用 manual lifecycle 持续到 DM 解除",
      "圣居的全部效应（选定生物类型不能自主进入、区域内魅惑/恐慌/附身终止，以及 5R 列出的 10 种额外效应之一）均无对应原语，由 DM 按 5R 原文执行",
      "与另一个圣居区域重叠时施法失败：系统不检测区域重叠，由 DM 在放置前确认",
      "24 小时施法时间只写入 Activity，不推进世界时间、不追踪施法打断",
      "1000 GP 熏香耗材只写入 contract material，不自动扣库存",
    ],
  },
  fragments: [
    graphFragment({
      id: "hallow-graph",
      actions: [
        action({
          id: "cast",
          name: "圣居 Hallow",
          activation: activation("hour", 24),
          visibility: "public",
        }),
      ],
      artifacts: [
        artifact({
          id: "hallow-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "circle", radius: 60, units: "ft" },
            stationary: true,
          },
          lifecycle: manual(),
        }),
        cleanRoomEffect("hallow-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Hallow Area",
          markerOnly: true,
          lifecycle: whileArtifact("hallow-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-hallow",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "circle",
              size: 60,
              range: null,
              rangeUnits: "touch",
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "hallow-zone",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Cast 是 24 小时 Activity，在触碰点放置一个半径 60 ft 的固定区域，只消耗一个五环或更高法术位",
    "区域是 visible cast-scope zone，进入与离开时动态登记或移除本次施法实例的成员 marker；不建立专注",
    "区域使用 manual lifecycle：DM 手动删除模板即解除，并连带清理成员 marker",
    "选定生物类型禁入、区域内魅惑/恐慌/附身终止与 5R 列出的额外效应之一由 DM 按 5R 原文执行",
    "与既有圣居区域重叠时由 DM 拒绝施法；1000 GP 熏香耗材只写入 contract material",
  ], { status: "compiler-passed" }),
});

export default hallow;
