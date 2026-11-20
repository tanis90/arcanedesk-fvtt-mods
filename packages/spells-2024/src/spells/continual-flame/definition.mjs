import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  graphFragment,
  manual,
  minimumTokenLight,
  operation,
  publicAction,
  rule,
  selected,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/2环.htm#Continual_Flame。
// 自动化等级：点亮被触碰的物件 Token（20 ft 明亮 + 额外 20 ft 微光）；遮挡、隐藏与解除由 DM 执行。
const continualFlame = cleanRoomSpell({
  id: "continual-flame",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 50,
      consumed: true,
    },
    lifetime: spellLifetime(),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "物件是否可被触碰、是否已燃着或能否承载火焰由 DM 确认；selected-targets 只记录一个 object 目标声明",
      "没有独立 Token 的携带物（硬币、箭头等）无法承载 Token 光照，由 DM 改挂在持有者 Token 上或手动照明",
      "「可以掩盖或隐藏火焰，但无法将其闷熄或扑灭」、不发热、不需燃料的叙事条款由 DM 执行；系统不追踪遮挡与熄灭",
      "「直至被解除」无法写入 contract lifetime（只接受 instant 或固定 duration）：contract 记为立即，效果使用 manual lifecycle 持续到 DM 解除",
    ],
  },
  fragments: [
    graphFragment({
      id: "continual-flame-graph",
      actions: [publicAction("cast", "不灭明焰 Continual Flame")],
      artifacts: [
        cleanRoomEffect("continual-flame", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Continual Flame",
          modifiers: [
            minimumTokenLight(constant(20), constant(40)),
          ],
          lifecycle: manual(),
        }),
      ],
      rules: [
        rule({
          id: "cast-continual-flame",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "object",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-continual-flame",
              artifactId: "continual-flame",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "action 触碰一个 object 声明目标并只消耗一个二环或更高法术位，不建立专注",
    "目标 Token 获得至少 20 ft 明亮 / 40 ft 微光的 Token 光照；原有更强光源不会被降低",
    "效果使用 manual lifecycle 持续到 DM 解除，同来源重施时 replace 旧效果而不叠加",
    "移除效果后恢复施法前的 Token 光照 baseline，施法者、非目标物件与其他效果不变",
    "物件选择、携带物替代处理、遮挡隐藏与「无法闷熄」条款保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default continualFlame;
