import {
  QA_LOG,
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  graphFragment,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/7环.htm#Reverse_Gravity。
// 自动化等级：区域 marker-only——DM 放置 50-ft 半径、100-ft 高柱状区域；向上坠落、抓握豁免与撞击由 DM 结算。
const reverseGravity = cleanRoomSpell({
  id: "reverse-gravity",
  contract: spellContract({
    ruleset: "2024",
    level: 7,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "区域内未固定于地面的生物与物件向上坠落、抵达顶端悬浮及法术终止后向下坠落，需要立体几何与坠落结算；由 DM 手动移动 Token 并按坠落规则处理",
      "生物以敏捷豁免抓住可触及固定物件以免向上坠落，属于可选豁免，自动化不发起",
      "坠落中撞击固体（天花板或被固定物件）的撞击伤害由 DM 按正常坠落结算",
      "ActiveAuras 对 measured template 只提供 XY membership；100-ft 柱状区域的垂直边界与不同 elevation 的成员关系由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "reverse-gravity-graph",
      actions: [publicAction("cast", "放置反转重力 Place Reverse Gravity")],
      artifacts: [
        artifact({
          id: "reverse-gravity-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: {
              type: "cylinder",
              radius: 50,
              height: 100,
              units: "ft",
            },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("reverse-gravity-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Reverse Gravity Area",
          markerOnly: true,
          lifecycle: whileArtifact("reverse-gravity-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-reverse-gravity",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cylinder",
              size: 50,
              height: 100,
              range: 100,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "reverse-gravity-zone",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 在 100 ft 内放置 50-ft 半径、100-ft 高的柱状持续区域；施法只消耗一个七环或更高法术位并建立最长一分钟的专注",
    "区域创建后为范围内成员挂上本来源的 Reverse Gravity Area marker，离开区域或来源结束时移除",
    "区域本身不发起豁免、不造成伤害、不移动 Token，也不改变重力或飞行状态",
    "向上坠落、抓握豁免、撞击伤害、顶端悬浮与结束时的下坠均由 DM 手动执行",
    "垂直边界与 elevation 成员判定保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default reverseGravity;
