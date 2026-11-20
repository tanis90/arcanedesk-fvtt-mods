import {
  QA_LOG,
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  manual,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/8环.htm#Earthquake。
// 自动化等级：500 ft 内半径 100 ft 区域 + 施法时的敏捷豁免/倒地；施法者回合的重发豁免与额外效应由 DM 结算。
const earthquake = cleanRoomSpell({
  id: "earthquake",
  contract: spellContract({
    ruleset: "2024",
    level: 8,
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
      "「法术持续时间内每个你的回合结束时」的重发敏捷豁免未接线：zone 回合脉冲只支持成员自己的回合，施法者回合结束时的结算由 DM 补掷",
      "区域地面被视为困难地形：没有 zone movement-cost 原语，由 DM 按实际穿越路径处理（与 entangle/spike-growth/grease 同口径）",
      "豁免失败同时打断专注：concentrationDisruption 会另掷一次独立豁免，与 RAW 的同一次豁免不符，故由 DM 在失败时手动结束专注（与 sleet-storm 同口径）",
      "两种额外效应（裂缝：1d6 条、深 1d10×10 ft、宽 10 ft、坠落敏捷豁免；建筑：每回合 50 钝击伤害、12d6 掩埋与 DC 20 力量（运动）脱困）由 DM 结算",
      "只影响「地面上的生物」与「地面上你可见的一点」：没有地面/可见性谓词，由 DM 在放置模板与结算时确认",
      "模板成员只有 XY 保证；垂直边界与不同 elevation 由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "earthquake-graph",
      actions: [publicAction("cast", "地震术 Earthquake")],
      artifacts: [
        artifact({
          id: "earthquake-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "circle", radius: 100, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("earthquake-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Earthquake Area",
          markerOnly: true,
          lifecycle: whileArtifact("earthquake-zone"),
        }),
        cleanRoomEffect("earthquake-prone", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Earthquake: Prone",
          modifiers: [grantStatus("prone")],
          lifecycle: manual(),
        }),
      ],
      rules: [
        rule({
          id: "cast-earthquake",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "circle",
              size: 100,
              range: 500,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "earthquake-zone",
              target: "target:cast",
            }),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["dex"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "earthquake-initial-save-failed",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "failure:apply-prone",
              artifactId: "earthquake-prone",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 在 500 ft 内地面一点放置半径 100 ft 的圆形区域，只消耗一个八环法术位并建立最长 1 分钟专注",
    "施法时区域内每个 creature 进行一次 Dexterity save；失败者获得 prone 效果，成功者不受影响",
    "prone 使用 manual lifecycle，由 DM 在生物起身时移除；不随区域结束自动解除",
    "区域为可见机械区域，进入与离开时动态登记或移除成员 marker",
    "施法者回合结束时的重发豁免、困难地形、专注打断、裂缝与建筑效应保持明确 omission，由 DM 结算",
    "解除专注、替换或一分钟到期时删除区域与成员 marker；不同施法来源按 cast identity 隔离",
  ], { status: "compiler-passed" }),
});

export default earthquake;
