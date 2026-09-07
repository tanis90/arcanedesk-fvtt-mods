import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  contentRef,
  duration,
  graphFragment,
  operation,
  publicAction,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
} from "../dsl.mjs";

const guardianOfFaith = cleanRoomSpell({
  id: "guardian-of-faith",
  contract: spellContract({
    ruleset: "2014",
    level: 4,
    school: "con",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: spellLifetime(duration(8, "hours")),
  }),
  content: contentRef("guardian-of-faith"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "系统不选择或放置守卫位置，也不创建 Token、Actor、visual、zone、MeasuredTemplate、membership 或 ActiveAuras；Cast 后由 DM 在施法者 30 ft 内核对一个施法者可见且未被占据的空间",
      "DM 先用 Foundry core square 模板画同中心的 30×30 ft 外层触发范围，再画 10×10 ft Large footprint；两个模板都只是手动桌面提示，不属于本法术自动化的 Artifact 或清理链",
      "系统不监听移动、不判断 hostile，也不保存每 turn 首次触发 receipt；DM 判断敌对生物在一个 turn 内第一次移动到守卫 10 ft 内空间的规则时机",
      "系统不创建 Dexterity saving throw 或 radiant damage workflow；DM 使用原施法 DC 结算失败 20 radiant、成功 10 radiant，并按实际伤害手动累计每个守卫的 60 点额度",
      "来源提醒 Effect 使用明确 8 小时 lifecycle，避免瞬时 utility Activity 产生 0 秒提醒；同一施法者多次 Cast 只生成多枚可分别删除但彼此等价的 fungible reminders，系统不记录哪枚提醒对应哪组手绘模板，DM 自行记账并在一个实例累计 60 点、被驱散或其他提前结束时删除那组模板与一枚提醒，满 8 小时自然到期后模板仍由 DM 手删",
    ],
  },
  fragments: [
    graphFragment({
      id: "guardian-of-faith-graph",
      actions: [publicAction("cast", "信仰守卫 Guardian of Faith")],
      artifacts: [
        cleanRoomEffect("guardian-of-faith-reminder", {
          host: "actor",
          scope: "cast-target",
          identityKeys: ["castUuid", "targetUuid"],
          reapply: "stack",
          name: "【DM手动】信仰守卫：按法术卡维护模板与60点额度",
          markerOnly: true,
          modifiers: [],
          lifecycle: duration(8, "hours"),
        }),
      ],
      rules: [
        rule({
          id: "cast-guardian-of-faith",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-guardian-of-faith-reminder",
              artifactId: "guardian-of-faith-reminder",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "法术契约保留 2014 四环 conjuration、仅 verbal component、30 ft 人工放置规则、八小时持续且不专注；公开 Cast 是 self utility，只消耗一个明确声明的四环或更高法术位",
    "每次 Cast 只在施法者 Actor 上应用一个可见、marker-only、明确 8 小时 lifecycle 的提醒 Effect；该 Effect 没有 modifier、status、save、damage、capacity、movement 或提前结束机械，且不得生成 0 秒 duration",
    "提醒 Effect 使用 cast-target identity 与 stack reapply，只保证同一施法者多次施法会保留多枚可分别删除的 fungible reminders；castUuid 是 schema identity，不对 UI 承诺提醒与手绘模板组的精确 provenance，DM 自行在桌面记账",
    "DM 五步工作流投影到玩家可见法术卡：Cast 后核对 30 ft 内可见未占空间；先画 30×30 ft core square 外层；再同中心画 10×10 ft footprint；手动判断敌对/每 turn 首次/DEX/20 或 10 radiant/累计 60；结束或提前结束一个守卫实例时删除那组模板与一枚提醒 Effect",
    "编译产物不得包含 Guardian 自动放置实体或模板、区域 membership、ActiveAuras、移动 hook、豁免/伤害 Activity、per-turn receipt、60 点账本、提前自动终止或模板自动清理；唯一自动到期是提醒 Effect 的明确 8 小时 lifecycle",
    "两张 core square 模板由 DM 独立维护；删除提醒 Effect 不声称会自动删除模板，删除模板也不声称会自动删除提醒 Effect，系统也不声称能把某枚提醒映射回某组模板",
  ], { status: "compiler-runtime-passed" }),
});

export default guardianOfFaith;
