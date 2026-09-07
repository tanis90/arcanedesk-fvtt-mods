import {
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
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
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const spikeGrowth = cleanRoomSpell({
  id: "spike-growth",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  content: contentRef("spike-growth"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "区域是 difficult terrain，需要按实际穿越路径增加移动消耗，不能等价为减半角色的全部 movement speed；当前 DSL/runtime 没有 zone movement-cost 原语，暂由 DM 处理",
      "生物每在区域内移动 5 ft 就承受 2d4 piercing damage；当前 DSL 缺少 token-moved zone trigger、区域内路径长度测量和按 5-ft 步数重复伤害的值表达式，因此不以固定 entry damage 冒充，暂由 DM 按 Foundry 路径裁定",
      "荆棘地形伪装成自然地貌；施法时未看见区域的生物在进入前可用 Wisdom (Perception) 对抗来源 spell save DC 识别危险。当前模板是公开机械提示，也没有按施法时可见性保存观察者集合的原语，暂由 DM 处理",
      "区域成员 marker 只按 XY 投影建立；飞在荆棘上方且未接触地面的 creature 需由 DM 按 elevation 排除",
    ],
  },
  fragments: [
    graphFragment({
      id: "spike-growth-zone-graph",
      actions: [publicAction("cast", "放置荆棘丛生 Place Spike Growth")],
      artifacts: [
        artifact({
          id: "spike-growth-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "circle", radius: 20, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("spike-growth-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Spike Growth Area",
          markerOnly: true,
          lifecycle: whileArtifact("spike-growth-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-spike-growth",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "circle",
              size: 20,
              range: 150,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "spike-growth-zone",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "DM 在施法者 150 ft 内放置一个 20-ft-radius 的地面持续区域，并只消耗一个二环或更高法术位",
    "任意阵营 creature 进入与离开区域时动态获得或移除本次施法实例的 Spike Growth Area marker；初次放置不会错误地向区域成员运行伤害 workflow",
    "施法建立最长十分钟的专注；解除、替换或到期结束专注时删除对应模板与成员 marker，不清理其他来源的区域",
    "当前自动化不修改角色 movement speed，也不在 entry、turn-start 或模板移动时伪造一次固定 2d4；difficult terrain 与每 5 ft 的路径伤害明确交由 DM",
    "公开模板只表示机械区域，不声称已经实现伪装、观察者可见性快照或 Wisdom (Perception) 识别流程",
    "成员 marker 只有 XY 保证；离地目标由 DM 处理",
  ], { status: "compiler-runtime-passed" }),
});

export default spikeGrowth;
