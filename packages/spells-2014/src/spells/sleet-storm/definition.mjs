import {
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  manual,
  operation,
  placedTemplate,
  predicate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

// Sleet Storm（2014）：三环咒法，专注至多 1 分钟，150 ft 内 40-ft radius /
// 20-ft height 圆柱。冻结边界（EX-8，2026-08-03）：区域困难地形 marker、
// 进入/turn-start 的 DEX save 失败 prone、专注干扰核心；重度遮蔽与火焰消融
// 等区域互动为显式 omission。
//
// 专注干扰已由 zone state 的 `concentrationDisruption: { ability: "con" }` 接线：
// compiler 在 zone event contract 上登记 disruption（相位取区域自身脉冲相位），
// 并合成一个隐藏 save-only Activity；runtime 在 zone 脉冲分发后对专注中的成员
// 执行该 CON save（DC 为来源施法者 spell save DC），失败则经 dnd5e 原生
// `endConcentration()` 结束其专注并级联清理。非专注成员不掷骰。
const sleetStorm = cleanRoomSpell({
  id: "sleet-storm",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  content: contentRef("sleet-storm"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "区域内 heavily obscured 对视线、攻击与可见性前提的机械影响是冻结边界显式 omission，由 DM 处理；spec 只建立可见模板与成员 marker，不以任何 sight/attack modifier 冒充",
      "区域内 exposed flames 被浇灭（火焰消融）及与其他区域/火焰的互动是冻结边界显式 omission，由 DM 处理",
      "专注干扰的时机按 DEX save 脉冲同机裁定（进入/区域内开始回合时），只对专注中的成员掷 CON save、失败经原生 endConcentration 断专注；非专注成员不掷骰",
      "区域为 difficult terrain，需按实际穿越路径增加移动消耗；当前 DSL/runtime 没有 zone movement-cost 原语，成员 marker 只作为困难地形提示，移动消耗由 DM 处理（与 grease/entangle/web 缺口径一致）",
      "倒地后的起身（花费一半移动力）由 DM/玩家按常规机械手动处理；prone 效果使用 manual lifecycle，不随区域结束或离开自动解除",
      "同一生物同一回合多次离开再进入区域时，zone receipt 每回合只结算第一次进入，与 RAW 'for the first time on a turn' 一致；但通过非移动方式进入（如被传送、或 DM 拖动模板覆盖到生物上）不会触发进入豁免：当前 enter 事件只从 token 移动上下文检测，这类进入的 Dexterity save 由 DM 补掷",
      "ActiveAuras 对 measured template 只提供 XY membership；cylinder 的 20 ft height 保留为 provider 元数据，不同 elevation 的成员关系与垂直边界由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "sleet-storm-zone-graph",
      actions: [publicAction("cast", "放置雨夹雪 Place Sleet Storm")],
      artifacts: [
        artifact({
          id: "sleet-storm-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "cylinder", radius: 40, height: 20, units: "ft" },
            stationary: true,
            concentrationDisruption: { ability: "con" },
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("sleet-storm-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Sleet Storm Area",
          markerOnly: true,
          lifecycle: whileArtifact("sleet-storm-zone"),
        }),
        cleanRoomEffect("sleet-storm-prone", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Sleet Storm Prone",
          modifiers: [grantStatus("prone")],
          lifecycle: manual(),
        }),
      ],
      rules: [
        // RAW 无"法术出现时在区域内即豁免"条款（与 grease 不同），施法瞬间
        // 不做初始 DEX save；首次结算发生在进入或区域内 turn-start 脉冲。
        rule({
          id: "cast-sleet-storm",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cylinder",
              size: 40,
              height: 20,
              range: 150,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "sleet-storm-zone",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "sleet-storm-entry-save",
          on: trigger("enter", { zoneId: "sleet-storm-zone" }),
          when: [
            predicate("once-per-turn", {
              identity: "zoneInstanceId + targetUuid + turn + phase",
            }),
          ],
          targets: [eventTarget("target:entry")],
          do: [
            operation("saving-throw", {
              id: "entry-save",
              ability: ["dex"],
              target: "target:entry",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "sleet-storm-entry-save-failed",
          on: trigger("operation-outcome", {
            operationId: "entry-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed-entry")],
          do: [
            operation("apply-artifact", {
              id: "entry:apply-prone",
              artifactId: "sleet-storm-prone",
              target: "target:failed-entry",
            }),
          ],
        }),
        rule({
          id: "sleet-storm-turn-start-save",
          on: trigger("turn-start", { subject: "zone-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "sleet-storm-membership",
              subject: "effect-target",
            }),
            predicate("once-per-turn", {
              identity: "zoneInstanceId + targetUuid + turn + phase",
            }),
          ],
          targets: [eventTarget("target:turn-start")],
          do: [
            operation("saving-throw", {
              id: "turn-start-save",
              ability: ["dex"],
              target: "target:turn-start",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "sleet-storm-turn-start-save-failed",
          on: trigger("operation-outcome", {
            operationId: "turn-start-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed-turn-start")],
          do: [
            operation("apply-artifact", {
              id: "turn-start:apply-prone",
              artifactId: "sleet-storm-prone",
              target: "target:failed-turn-start",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "DM 在施法者 150 ft 内放置一个 40-ft radius、20-ft height 的圆柱持续区域；一次合法施法只消耗一个三环或更高法术位，并建立最长一分钟专注",
    "施法瞬间位于区域内的 creature 不做立即 Dexterity save（RAW 无出现即豁免条款）；首次结算发生在其每回合首次进入区域或在区域内开始回合时",
    "creature 每回合首次进入区域或在区域内开始自己的回合时进行 Dexterity save；进入与 turn-start 两类脉冲凭 zone receipt 每回合各结算一次，失败获得来源绑定的 prone，成功不改变",
    "已应用的 prone 为 manual lifecycle，不随离开区域、区域结束或法术到期自动解除，由 DM/玩家按常规起身机械手动处理",
    "任意阵营 creature 进入与离开区域时动态获得或移除本次施法实例的成员 marker；该 marker 只作为 difficult terrain 提示，实际路径移动消耗由 DM 处理，不以速度修改冒充",
    "区域内专注中的 creature 在进入/turn-start 脉冲同机做 Constitution save（对抗来源施法者 spell save DC），失败经原生 endConcentration 断专注并级联清理其自有法术；非专注成员不掷骰",
    "heavily obscured 的视线/攻击影响与 exposed flames 浇灭是冻结边界显式 omission，不由模板或 marker 冒充",
    "解除、替换或到期结束专注时删除对应区域模板与成员 marker；不同施法来源按 cast identity 隔离，删除其一不影响另一来源的区域与成员",
    "区域成员判定只有 XY 保证；cylinder 的 20 ft height 仅为 provider 元数据，垂直边界由 DM 处理",
  ], { status: "compiler-runtime-passed" }),
});

export default sleetStorm;
