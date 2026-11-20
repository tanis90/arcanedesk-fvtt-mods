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

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/1环.htm#Detect_Magic。
// 自动化等级：utility marker-only——2024 起升为一环；施法卡、专注与扣槽自动化；灵光与学派判读由 DM 口述。
const detectMagic = cleanRoomSpell({
  id: "detect-magic",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "div",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    ritual: true,
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "30 ft 内的魔法效应、后续魔法动作看到的灵光与学派判读全部由 DM 口述；系统不扫描场景或 Item，也不生成 aura 视觉",
      "「用一个魔法动作观察灵光」是施法后的第二次独立动作，本实现只提供第一个 action 施法入口，观察由 DM 直接回答",
      "以仪式施放（不消耗法术位、施法时间 +10 分钟）不消耗法术位；本自动化只覆盖消耗法术位的施法路径，仪式施法由 DM 手工记录",
    ],
  },
  fragments: [
    graphFragment({
      id: "detect-magic-graph",
      actions: [publicAction("cast", "侦测魔法 Detect Magic")],
      artifacts: [
        cleanRoomEffect("detect-magic", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Detect Magic",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-detect-magic",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "detect-magic",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "施法者以 action 施放并只消耗一个一环法术位（2024 起升为一环，2014 为戏法），建立最长 10 分钟的专注与自身 Detect Magic marker",
    "施法不选择目标、不造成伤害、不改变任何 Actor 的数值；30 ft 内是否存在魔法效应由 DM 依据 5R 原文口述",
    "施法后的魔法动作观察灵光与分辨创造该效应的魔法学派由 DM 直接回答，系统不生成 aura 或学派数据",
    "解除专注、替换专注或 10 分钟到期时清理本次来源的 marker，不影响其他效果",
    "仪式施法不消耗法术位，由 DM 手工记录；遮挡规则（1 尺岩石/泥土/木头、1 寸金属、薄铅层）由 DM 判断",
  ], { status: "compiler-passed" }),
});

export default detectMagic;
