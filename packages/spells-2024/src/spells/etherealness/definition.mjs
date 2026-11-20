import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/7环.htm#Etherealness。
// 自动化等级：marker-only——8 小时来源标记；以太边界移动、透视与回归由 DM 换场景执行。
const etherealness = cleanRoomSpell({
  id: "etherealness",
  contract: spellContract({
    ruleset: "2024",
    level: 7,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(duration(8, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "marker-only",
    omissions: [
      "以太边界（Ethereal Border）不是独立 Scene：进入与离开、向任意方向移动、上下移动每尺额外消耗一尺移动力，均由 DM 换场景或手动记录",
      "以太位面期间只能观察原位面且呈灰度、看不到 60 ft 外、只有同样处于以太位面的生物/物件/效应才能互相影响，均由 DM 叙述裁定；系统不施加 invisible 或其他状态，也不修改视野",
      "法术终止时回到原位面对应位置、被占据时弹到最近未占据空间并承受两倍移动尺数的力场伤害，由 DM 结算；系统不移动或惩罚 Token",
      "施法时已在以太位面、或所在位面不与以太位面相连时法术立即结束，由 DM 判定",
      "八环可带至多 3 名、九环至多 6 名 10 ft 内自愿生物（含自己）的升环目标扩展未自动化：本定义只对施法者建立标记",
    ],
  },
  fragments: [
    graphFragment({
      id: "etherealness-graph",
      actions: [publicAction("cast", "以太化 Etherealness")],
      artifacts: [
        cleanRoomEffect("etherealness", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Etherealness",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-etherealness",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "etherealness",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 施放并只消耗一个七环或更高法术位，在施法者身上建立最长 8 小时、非专注的 Etherealness 来源标记",
    "标记不移动 Token、不切换 Scene、不修改视野与光照，也不施加任何状态",
    "以太边界的移动规则、灰度观察与 60 ft 视距、跨位面互动限制由 DM 按 5R 原文执行",
    "终止时的回归位置、被占据时的弹开与力场伤害由 DM 结算",
    "升环带人（3 名 / 6 名）保持明确 omission，本实现不创建同伴目标",
  ], { status: "compiler-passed" }),
});

export default etherealness;
