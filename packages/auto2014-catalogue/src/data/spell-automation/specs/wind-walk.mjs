import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  constant,
  consume,
  duration,
  excludeSource,
  graphFragment,
  grantWeaponAttackDamageResistance,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  setMovement,
  spellContract,
  spellLifetime,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const L6_RUNTIME_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-6-runtime-qa-2026-09-02.md";

const cloudFormModifiers = () => [
  setMovement("fly", constant(300)),
  grantWeaponAttackDamageResistance(
    ["bludgeoning", "piercing", "slashing"],
    { weaponMagic: "nonmagical" },
  ),
];

const windWalk = cleanRoomSpell({
  id: "wind-walk",
  contract: spellContract({
    ruleset: "2014",
    level: 6,
    school: "trs",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: spellLifetime(duration(8, "hours")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "willing 与可见资格由 DM 在调用 Cast 前确认；willing predicate 只记录声明，不替 DM 推断目标意愿",
      "cloud form 期间只能 Dash 或开始还原，以及还原或恢复 cloud form 各耗时 1 分钟、过渡期间 incapacitated 且不能移动，均由 DM 执行",
      "法术结束时仍在空中的目标每轮安全下降 60 ft、最多持续 1 分钟；尚未落地后的坠落与伤害由 DM 处理",
      "每个 source/target Effect 由 Foundry 独立计时 8 小时；若 DM 因叙事裁决提前结束整次施法，先删除施法者的 source Effect，再删除该次施法涉及的 companion Effects。非专注法术不新增 cast-level 级联状态机或持久 cast marker",
    ],
  },
  fragments: [
    graphFragment({
      id: "wind-walk-graph",
      actions: [
        publicAction("cast", "御风而行 Wind Walk", {
          activationType: "minute",
        }),
      ],
      artifacts: [
        cleanRoomEffect("wind-walk-source-cloud-form", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Wind Walk: Cloud Form",
          modifiers: cloudFormModifiers(),
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("wind-walk-target-cloud-form", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Wind Walk: Cloud Form",
          modifiers: cloudFormModifiers(),
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-wind-walk",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:companions", {
              min: 0,
              max: 10,
              range: 30,
              units: "ft",
              kind: "creature",
              predicates: [
                excludeSource(),
                predicate("visible-to-source"),
                predicate("willing"),
              ],
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-source-cloud-form",
              artifactId: "wind-walk-source-cloud-form",
              target: "source",
            }),
            operation("apply-artifact", {
              id: "cast:apply-target-cloud-form",
              artifactId: "wind-walk-target-cloud-form",
              target: "target:companions",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L6_RUNTIME_QA_RECEIPT, [
    "Cast 是 1 分钟 selected-targets public Activity；施法者自动获得 Cloud Form，另可选择 0 至 10 名 30 ft 内由 DM 声明确认可见且 willing 的 creatures，并只消耗一个六环或更高法术位",
    "施法者与每个所选目标分别获得持续最长 8 小时、非专注且来源绑定的 Wind Walk: Cloud Form Effect；source 与 target Effect 都将 flying speed 精确设为 300 ft",
    "source 与 target Cloud Form Effect 都只对非魔法武器攻击造成的 bludgeoning、piercing、slashing damage 授予 resistance；魔法武器、法术攻击、非武器能力及同一命中的其他伤害类型不获减免",
    "cloud form 的 Action 限制、1 分钟还原与恢复过程、过渡期间 incapacitated 和不能移动，以及法术结束后的 60 ft/round 安全下降与最终坠落均保持明确 DM omission",
    "施法者不能作为 companion 再次进入所选目标集合；第 11 个额外目标、超出 30 ft 或未被 DM 声明为可见且 willing 的目标必须在 world write 前拒绝；0 个额外目标仍对施法者正常生效",
    "同一来源重施只 replace 施法者自身以及本次再次选中的 source-target Effect；未再次选中的既有目标作为前一次非专注施法的独立 8 小时 Effect 保留。自然到期或逐项手动删除只清理精确来源实例，不影响其他施法者来源或非目标",
  ], { status: "compiler-runtime-passed" }),
});

export default windWalk;
