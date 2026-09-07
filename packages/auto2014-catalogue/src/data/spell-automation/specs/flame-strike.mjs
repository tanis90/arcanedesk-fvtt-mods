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
} from "../dsl.mjs";

const L5_WAVE_I1_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wave-i1-qa-2026-08-26.md";

const flameStrike = cleanRoomSpell({
  id: "flame-strike",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
    school: "evo",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(instant()),
    primaryActionId: "cast-fire-scaling",
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
        publicAction(
          "cast-fire-scaling",
          "焰击术：火焰升环 Flame Strike: Fire Scaling",
        ),
        publicAction(
          "cast-radiant-scaling",
          "焰击术：光耀升环 Flame Strike: Radiant Scaling",
        ),
      ],
      rules: [
        rule({
          id: "cast-flame-strike-fire-scaling",
          on: trigger("action-used", { actionId: "cast-fire-scaling" }),
          targets: [
            placedTemplate("target:fire-scaling", {
              type: "cylinder",
              size: 10,
              height: 40,
              range: 60,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume("fire-scaling:consume"),
            operation("saving-throw", {
              id: "fire-scaling-save",
              ability: ["dex"],
              target: "target:fire-scaling",
              onSave: "half",
            }),
            operation("damage", {
              id: "fire-scaling-fire-damage",
              target: "target:fire-scaling",
              formula: perSlotAboveBase(
                dice(4, 6),
                dice(1, 6),
              ),
              damageTypes: ["fire"],
              onSave: "half",
            }),
            operation("damage", {
              id: "fire-scaling-radiant-damage",
              target: "target:fire-scaling",
              formula: dice(4, 6),
              damageTypes: ["radiant"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "cast-flame-strike-radiant-scaling",
          on: trigger("action-used", { actionId: "cast-radiant-scaling" }),
          targets: [
            placedTemplate("target:radiant-scaling", {
              type: "cylinder",
              size: 10,
              height: 40,
              range: 60,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume("radiant-scaling:consume"),
            operation("saving-throw", {
              id: "radiant-scaling-save",
              ability: ["dex"],
              target: "target:radiant-scaling",
              onSave: "half",
            }),
            operation("damage", {
              id: "radiant-scaling-fire-damage",
              target: "target:radiant-scaling",
              formula: dice(4, 6),
              damageTypes: ["fire"],
              onSave: "half",
            }),
            operation("damage", {
              id: "radiant-scaling-radiant-damage",
              target: "target:radiant-scaling",
              formula: perSlotAboveBase(
                dice(4, 6),
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
    "Fire Scaling 与 Radiant Scaling 是两个明确命名的 public Activities；二者都使用 placed-template 输入，并且一次施法只消费一个明确声明的五环或更高法术位",
    "DM 在施法者 60 ft 内放置 10-ft-radius、schema height 40 ft 的 cylinder；同一 workflow 快照二维模板内 creature，非目标保持不变",
    "两个 Activity 都要求 Dexterity save；失败承受 4d6 fire 与 4d6 radiant，成功时两部分分别半伤",
    "Fire Scaling 每高一环只给 fire 增加 1d6，radiant 固定为 4d6；Radiant Scaling 每高一环只给 radiant 增加 1d6，fire 固定为 4d6",
    "高度、elevation 与墙体边界保持明确 DM omission，不把二维 XY 模板验收描述为完整三维规则支持",
  ], { status: "compiler-runtime-passed" }),
});

export default flameStrike;
