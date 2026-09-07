import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  graphFragment,
  operation,
  predicate,
  publicAction,
  requiresSourceArtifact,
  rule,
  self,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const expeditiousRetreat = cleanRoomSpell({
  id: "expeditious-retreat",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "expeditious-retreat-graph",
      actions: [
        publicAction("cast", "脚底抹油 Expeditious Retreat", {
          activationType: "bonus",
        }),
        publicAction("dash", "脚底抹油：疾走 Dash", {
          activationType: "bonus",
          availableWhen: [requiresSourceArtifact("retreat-source")],
        }),
      ],
      artifacts: [
        cleanRoomEffect("retreat-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Expeditious Retreat",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-expeditious-retreat",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-retreat-source",
              artifactId: "retreat-source",
              target: "source",
            }),
            operation("dash", {
              id: "cast:immediate-dash",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "dash-while-retreating",
          on: trigger("action-used", { actionId: "dash" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "retreat-source",
              subject: "source",
            }),
          ],
          targets: [self("target:dash")],
          do: [
            operation("dash", {
              id: "retreat:bonus-action-dash",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(EXPANSION_BATCH, [
    "cast 是 bonus action，只消耗一个一环或更高法术位，建立最长十分钟的来源专注 marker，并在同一次施法中结算一次语义 Dash",
    "施法时的立即 Dash 是 cast 的组成部分，不再消耗一个 bonus action，也不创建第二次法术位消费",
    "专注期间 dash 是来源绑定的独立 bonus action；每次合法使用都完成一次语义 Dash 且不永久修改任何 movement speed；Foundry 当前不记录回合移动预算，实际 token 移动仍由 DM/玩家执行",
    "施法者自己的 bonus-action economy 限制同一回合的后续 dash 使用；其他生物不会获得该来源绑定 action",
    "解除、替换或到期结束专注时精确清理 marker，dash 随即不可见且直接调用旧 action id 会被拒绝",
  ], { status: "compiler-runtime-passed" }),
});

export default expeditiousRetreat;
