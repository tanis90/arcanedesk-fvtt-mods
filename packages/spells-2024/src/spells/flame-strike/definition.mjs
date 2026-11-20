import {
  acceptance,
  cleanRoomSpell,
  consume,
  dice,
  graphFragment,
  instant,
  operation,
  perSlotAboveBase,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 C 桶 recipe-invalid，c-dm）：2024 是 5d6 火焰 + 5d6 光耀，
// 升环时两部分各 +1d6（2014 的 4d6+4d6 与「择一升环」双 Activity 随之删除）。
// 5R 锚点：玩家手册2024/法术详述/5环.htm#Flame_Strike。
const L5_WAVE_I1_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wave-i1-qa-2026-08-26.md";

const flameStrike = cleanRoomSpell({
  id: "flame-strike",
  contract: spellContract({
    ruleset: "2024",
    level: 5,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "Runtime 只承诺二维 XY 模板成员；40 ft height 仅保留为 schema/provider 元数据，高度、elevation 与墙体边界由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "flame-strike-graph",
      actions: [
        publicAction("cast", "焰击术 Flame Strike"),
      ],
      rules: [
        rule({
          id: "cast-flame-strike",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cylinder",
              size: 10,
              height: 40,
              range: 60,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["dex"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-fire-damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(5, 6),
                dice(1, 6),
              ),
              damageTypes: ["fire"],
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-radiant-damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(5, 6),
                dice(1, 6),
              ),
              damageTypes: ["radiant"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L5_WAVE_I1_QA_RECEIPT, [
    "Cast 使用 placed-template 输入，一次施法只消费一个明确声明的五环或更高法术位",
    "DM 在施法者 60 ft 内放置 10-ft-radius、schema height 40 ft 的 cylinder；同一 workflow 快照二维模板内 creature，非目标保持不变",
    "模板成员进行 Dexterity save；失败承受 5d6 fire 与 5d6 radiant，成功时两部分分别半伤",
    "每高一环火焰与光耀伤害各增加 1d6（2024 口径，单一 Cast 覆盖两部分升环）",
    "高度、elevation 与墙体边界保持明确 DM omission，不把二维 XY 模板验收描述为完整三维规则支持",
  ], { status: "compiler-passed" }),
});

export default flameStrike;
