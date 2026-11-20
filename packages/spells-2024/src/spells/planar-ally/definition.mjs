import {
  QA_LOG,
  acceptance,
  action,
  activation,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  graphFragment,
  manual,
  operation,
  rule,
  self,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// 2024 审计 transplant-ok（10 分钟/60 尺/天族元素邪魔派遣机制一致），但 summon 池
// documentId 无法指向官方 actors24 uuid，故只保留施法扣槽与服务标记，盟友由 DM 手动放置。
// 5R 锚点：5R 玩家手册2024 6环.htm#Planar_Ally。
const planarAlly = cleanRoomSpell({
  id: "planar-ally",
  contract: spellContract({
    ruleset: "2024",
    level: 6,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "盟友不由本定义创建：施法后由 DM 手动放置 Deva、Djinni 或等效天族/元素/邪魔（若沿用官方 actors24 profile，Cambion 无等价项，以同层级 Barbed Devil 代替）；系统不建 Token、不校验 60 ft 未占据空间或生物类型",
      "神祇/恶魔主君等实体的响应、指派与「说出名字仍可能得到另一生物（DM 选择）」由 DM 叙事决定",
      "报酬协商（每分钟 100 GP、每小时 1000 GP、每日至多 10 日的 10000 GP、风险调整与半价/免费）以及任务能否达成一致，全部由 DM 处理",
      "服务期限、盟友返回家乡位面、任务完成后的报告与提前遣返由 DM 手动结束；来源标记只表示本次施法仍在协商/服务期内，需 DM 精确删除",
      "10 分钟施法时间只作为 activity 元数据，不推进世界时间、不追踪施法中断",
      "本定义不消耗或多扣报酬物件，也不校验施法者与盟友是否能交流",
      "施法距离 60 ft 以 self 记录：盟友由 DM 手动放置，本定义不建立目标选择或落点校验",
    ],
  },
  fragments: [
    graphFragment({
      id: "planar-ally-graph",
      actions: [
        action({
          id: "cast",
          name: "异界誓盟 Planar Ally",
          activation: activation("minute", 10),
          visibility: "public",
        }),
      ],
      artifacts: [
        cleanRoomEffect("planar-ally-service", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Planar Ally: Service",
          markerOnly: true,
          modifiers: [],
          lifecycle: manual(),
        }),
      ],
      rules: [
        rule({
          id: "cast-planar-ally",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-service",
              artifactId: "planar-ally-service",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "cast 是一个 10 分钟 utility activity，只消耗一个六环或更高法术位，不选择 token 也不掷骰",
    "施法创建一个 manual lifecycle 的 Planar Ally: Service 来源标记，重复施法以 replace 刷新，不叠加",
    "盟友的指派、生物类型、60 ft 内未占据落点与 Token 创建由 DM 手动完成，含 Cambion→Barbed Devil 的替代裁决",
    "报酬协商、任务内容、服务期限、报告与遣返全部保持 DM 叙事边界",
    "2024 删除的经验值条款与召唤活动建模不再出现，本定义也不伪造召唤物成员或控制关系",
    "10 分钟施法时间不推进世界时间、不追踪中断；取消施法由 DM 在扣槽前处理",
  ], { status: "compiler-passed" }),
});

export default planarAlly;
