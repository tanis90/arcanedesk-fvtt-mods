import {
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  graphFragment,
  operation,
  perSlotAboveBase,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const wallOfIceDamage = perSlotAboveBase(
  dice(10, 6),
  dice(2, 6),
);

const wallOfIce = cleanRoomSpell({
  id: "wall-of-ice",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(10, "minutes")),
    primaryActionId: "line",
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "首波只生成一条固定 100-ft-long、5-ft-wide 的二维 Line，作为最多十块 10×10 ft、厚 1 ft 冰墙面板的可见简化；任意面板排列、少于十块、真实厚度与高度由 DM 在放置后用标准 Drawing/Template 工具调整",
      "10-ft-radius Hemisphere/Sphere 形态未生成 public Action；采用这些形态时由 DM 用标准 Foundry Drawing/Template 手工放置，并按本法术相同的初始 Dexterity save 与伤害规则结算",
      "初始 workflow 结算后，DM 立即把被墙切过空间的每个生物移到所选一侧；runtime 不选择推位方向、不移动 Token，也不检查墙体空间和已有实体的合法性",
      "DM 为每个实际面板分别记录 AC 12、30 HP 与 fire damage vulnerability；面板受击时手工结算伤害，降至 0 HP 时删除、缩短或标注对应墙段，runtime 不创建 panel Actor、WallDocument、碰撞或视线状态机",
      "面板被摧毁后，DM 在原墙段标记 frigid air；生物在自己的回合第一次进入该区域时，DM 以施法者 spell save DC 掷 Constitution save，失败承受 5d6 cold、成功一半，每高于六环一环增加 1d6，并按生物与回合手工去重；本次专注结束时由 DM 删除 frigid-air 标记",
    ],
  },
  fragments: [
    graphFragment({
      id: "wall-of-ice-zone-graph",
      actions: [
        publicAction("line", "冰墙术：直墙 Wall of Ice: Line"),
      ],
      artifacts: [
        artifact({
          id: "wall-of-ice-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: {
              type: "line",
              size: 100,
              width: 5,
              units: "ft",
            },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("wall-of-ice-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "【系统】冰墙术：墙格成员（无脉冲）",
          markerOnly: true,
          lifecycle: whileArtifact("wall-of-ice-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-wall-of-ice-line",
          on: trigger("action-used", { actionId: "line" }),
          targets: [
            placedTemplate("target:line", {
              type: "line",
              size: 100,
              width: 5,
              range: 120,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "line:create-zone",
              artifactId: "wall-of-ice-zone",
              target: "target:line",
            }),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["dex"],
              target: "target:line",
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-damage",
              target: "target:line",
              formula: wallOfIceDamage,
              damageTypes: ["cold"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "唯一 public Line 使用 placed-template 输入；DM 在施法者 120 ft 内放置并定向一条固定 100-ft-long、5-ft-wide 的二维直墙",
    "施法瞬间只对 Line 模板快照内 creature 进行一次 Dexterity save；六环失败承受 10d6 cold、成功一半，七环为 12d6，模板外非目标不变",
    "一次施法只消耗一个明确声明的六环或更高法术位并建立最长 10 分钟专注；每高一环只给初始伤害增加 2d6",
    "Line 创建按 cast 隔离的持续可见模板与 membership marker；专注结束、替换或到期时精确清理，不影响其他来源或 DM 手工 Drawing",
    "完整墙体没有 entry、turn-start 或 turn-end pulse；后续进入完整墙格不会自动掷骰或受伤，未破坏墙段不会产生 frigid-air 结算",
    "Hemisphere/Sphere、面板排列与厚度、推位、AC 12、30 HP、fire vulnerability、破段和 frigid air 均按 omission 中的精确 DM 步骤处理，不冒充已自动化",
  ], { status: "compiler-runtime-passed" }),
});

export default wallOfIce;
