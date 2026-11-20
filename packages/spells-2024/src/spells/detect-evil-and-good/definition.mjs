import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/1环.htm#Detect_Evil_and_Good。
// 自动化等级：marker-only——专注与来源标记自动化；30 ft 内的类型定位与圣居感知由 DM 口述。
const detectEvilAndGood = cleanRoomSpell({
  id: "detect-evil-and-good",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "div",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "marker-only",
    omissions: [
      "30 ft 内异怪、天族、元素、妖精、邪魔、亡灵的位置由 DM 依据场景口述；系统不扫描 Token 类型，也不生成 aura",
      "激活的圣居（Hallow）是否存在及其位置由 DM 判断；系统不查询区域 Effect",
      "1 尺厚岩石/泥土/木头、1 寸厚金属或薄层铅的阻隔由 DM 判断；系统不做遮挡计算",
      "法术为自身距离、不选择目标：公开 Cast 只产生聊天卡与自身标记，不改变任何 Actor 数值或状态",
    ],
  },
  fragments: [
    graphFragment({
      id: "detect-evil-and-good-graph",
      actions: [publicAction("cast", "侦测善恶 Detect Evil and Good")],
      artifacts: [
        cleanRoomEffect("detect-evil-and-good", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Detect Evil and Good",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-detect-evil-and-good",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "detect-evil-and-good",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 施放并只消耗一个一环或更高法术位，在施法者身上建立最长 10 分钟的专注与 Detect Evil and Good 来源标记",
    "施法不选择目标、不进行豁免、不改变任何 Actor 的数值或状态",
    "30 ft 内异怪/天族/元素/妖精/邪魔/亡灵的存在与位置，以及激活圣居的感知，由 DM 依据 5R 原文口述",
    "解除专注、替换专注或 10 分钟到期时清理本次来源的标记，不影响其他效果",
    "材料阻隔规则保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default detectEvilAndGood;
