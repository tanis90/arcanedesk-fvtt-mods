import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomFollowingAura,
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

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/8环.htm#Antimagic_Field。
// 自动化等级：marker + 跟随光环——10-ft 光环可视化；法术/魔法物品压制、传送封锁与位面旅行禁令由 DM 裁定。
const antimagicField = cleanRoomSpell({
  id: "antimagic-field",
  contract: spellContract({
    ruleset: "2024",
    level: 8,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "灵光内禁止施法、使用魔法动作与创造魔法效应，以及魔法物品词条失效，属于全局规则压制；自动化不拦截其他 Item 或 Activity",
      "持续法术在区域内被压制（神器或神明所施者除外）、效应区域不能延伸入内、传送与位面旅行被阻断、传送门暂时关闭，均由 DM 裁定",
      "解除魔法对灵光无效以及不同反魔法场互不抵消，由 DM 处理",
      "光环只按施法者 Token 的 XY 半径可视化，垂直边界与 elevation 判定由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "antimagic-field-graph",
      actions: [publicAction("cast", "反魔法场 Antimagic Field")],
      artifacts: [
        cleanRoomEffect("antimagic-field", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Antimagic Field",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
        cleanRoomFollowingAura("antimagic-field-aura", {
          sourceArtifactId: "antimagic-field",
          radius: 10,
          recipientPolicy: "all",
          includeSelf: true,
          color: "#64748b",
          opacity: 0.16,
        }),
      ],
      rules: [
        rule({
          id: "cast-antimagic-field",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "antimagic-field",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "self cast 只消耗一个八环或更高法术位，并建立最长一小时的专注",
    "施法者为来源获得 Antimagic Field 标记，同时出现跟随施法者的 10-ft 半径光环可视化",
    "光环不拦截施法、不压制其他 ActiveEffect、不改变传送或位面旅行，只提供可见范围",
    "替换、取消专注或到期时清理本来源标记与光环，不影响其他来源",
    "反魔法压制细则与神器/神明例外保持明确 omission，由 DM 执行",
  ], { status: "compiler-passed" }),
});

export default antimagicField;
