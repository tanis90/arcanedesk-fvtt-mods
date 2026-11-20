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

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/1环.htm#Detect_Poison_and_Disease。
// 自动化等级：utility marker-only——施法卡、专注与扣槽自动化；毒药/有毒生物/魔法疫病的定位与种类由 DM 口述。
const detectPoisonAndDisease = cleanRoomSpell({
  id: "detect-poison-and-disease",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "div",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    ritual: true,
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "毒药、有毒生物与魔法疫病的定位、种类判读完全由 DM 口述；系统不扫描场景、Actor 或 Item，也不在 30 ft 内生成发现结果",
      "默认 DM 只在确认 30 ft 内确有目标时批准施法；范围、遮挡（1 尺岩石/泥土/木头、1 寸金属、薄铅层）与目标存在性不自动校验",
      "以仪式施放（不消耗法术位、施法时间 +10 分钟）不消耗法术位；本自动化只覆盖消耗法术位的施法路径，仪式施法由 DM 手工记录",
    ],
  },
  fragments: [
    graphFragment({
      id: "detect-poison-and-disease-graph",
      actions: [
        publicAction("cast", "侦测毒性和疾病 Detect Poison and Disease"),
      ],
      artifacts: [
        cleanRoomEffect("detect-poison-and-disease", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Detect Poison and Disease",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-detect-poison-and-disease",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "detect-poison-and-disease",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "施法者以 action 施放并只消耗一个一环法术位，建立最长 10 分钟的专注与自身 Detect Poison and Disease marker",
    "施法不选择目标、不造成伤害、不改变任何 Actor 的数值；30 ft 内的毒药、有毒生物与魔法疫病及其种类由 DM 依据 5R 原文口述",
    "解除专注、替换专注或 10 分钟到期时清理本次来源的 marker，不影响其他效果",
    "仪式施法不消耗法术位，由 DM 手工记录；本自动化只覆盖消耗法术位的施法路径",
    "遮挡规则（1 尺岩石/泥土/木头、1 寸金属、薄铅层）与法术不穿透的事实由 DM 判断",
  ], { status: "compiler-passed" }),
});

export default detectPoisonAndDisease;
