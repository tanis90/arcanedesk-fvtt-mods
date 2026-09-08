import {
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

const L5_WAVE_I4_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wave-i4-qa-2026-08-27.md";

const telekinesis = cleanRoomSpell({
  id: "telekinesis",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "manual",
    omissions: [
      "施法时及持续期间每回合使用 action，由施法者进行 spellcasting ability check、与 creature 或携带物件者的 Strength check 对抗；检定、胜负和 action economy 均由 DM 处理",
      "creature 分支只允许 Huge 或更小目标；成功后 restrained、向任意方向移动至多 30 ft、悬空与直到施法者下一回合结束的维持时限均由 DM 通过标准 Foundry UI 处理，系统不创建 restrained Effect",
      "object 分支的 1,000 lb 上限、无人穿戴/携带时自动移动、穿戴/携带者对抗检定、夺取物件及精细操控均由 DM 处理",
      "每次移动后的目标必须仍在施法者 60 ft 内；可见性、30 ft 路径、碰撞、墙体、高度、合法落点以及 Token 或物件拖动均由 DM 裁定和执行",
      "持续影响同一目标需要在后续回合重复对抗检定，切换目标会结束旧目标的影响；系统不追踪当前目标、维持回合或切换状态",
    ],
  },
  fragments: [
    graphFragment({
      id: "telekinesis-graph",
      actions: [publicAction("cast", "心灵遥控 Telekinesis")],
      artifacts: [
        cleanRoomEffect("telekinesis-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Telekinesis",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-telekinesis",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-telekinesis-source",
              artifactId: "telekinesis-source",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L5_WAVE_I4_QA_RECEIPT, [
    "唯一 public Cast 使用 self 输入；角色卡与 Context Exec 调用同一个 compiler-emitted Activity，不要求 agent 提供目标、坐标、物件 UUID 或内部动作",
    "Cast 真实消费一个明确声明的五环或更高法术位，并在施法者建立最长 10 分钟的原生专注与 source-scoped Telekinesis marker",
    "marker 只表示本法术正在持续，不包含 target identity、restrained、移动、检定结果或物件状态；其他 Actor、Token、物件和世界状态在 Cast 后保持不变",
    "解除、替换、到期或手动结束专注时精确清理来源 marker；重施只替换同一来源 marker，不留下重复状态",
    "DM 在施法后使用标准 Actor/Token/物件 UI 完成每回合 action、对抗检定、Huge/1,000 lb 资格、30 ft 移动、60 ft 有效范围、restrained/悬空、维持或切换目标与精细物件操控；系统不把这些 manual 步骤冒充为自动化",
  ], { status: "compiler-runtime-passed" }),
});

export default telekinesis;
