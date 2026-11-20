import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  add,
  blockActionKinds,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  duration,
  endSourceWhenLastDependentEnds,
  firstOf,
  grantConditionImmunity,
  grantHover,
  grantResistance,
  graphFragment,
  levelsAboveBase,
  operation,
  publicAction,
  rule,
  selected,
  setMovement,
  spellContract,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（M1.0 审计 A/B 桶 desc-diff-flag）：2024 抗性收窄为钝击/穿刺/挥砍，
// 新增倒地免疫与「目标用魔法动作自解」，删去力量/敏捷/体质豁免优势。
// 5R 锚点：玩家手册2024/法术详述/3环.htm#Gaseous_Form。
const gaseousForm = cleanRoomSpell({
  id: "gaseous-form",
  contract: spellContract({
    ruleset: "2024",
    level: 3,
    school: "trs",
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
      "目标是否自愿、进入其他生物空间、穿过小孔或裂缝以及将液体视为固体仍由 DM 裁定",
      "不能说话或操纵物件、随身物件不掉落且不能使用仍由 DM 裁定",
      "2024 的「目标用魔法动作终止其身上的法术效应」没有可用的 target-hosted dismiss 原语，由 DM 删除被施法目标身上的本来源 Effect",
    ],
  },
  fragments: [
    graphFragment({
      id: "gaseous-form-graph",
      actions: [publicAction("cast", "气化形体 Gaseous Form")],
      artifacts: [
        cleanRoomEffect("gaseous-form", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Gaseous Form",
          modifiers: [
            setMovement("walk", constant(0)),
            setMovement("burrow", constant(0)),
            setMovement("climb", constant(0)),
            setMovement("swim", constant(0)),
            setMovement("fly", constant(10)),
            grantHover(),
            grantResistance("bludgeoning"),
            grantResistance("piercing"),
            grantResistance("slashing"),
            grantConditionImmunity("prone"),
            blockActionKinds(["attack", "spell"]),
          ],
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: firstOf(
            whileSpellActive(),
            untilTrigger(
              trigger("hit-points-depleted", { subject: "effect-target" }),
            ),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-gaseous-form",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: add(constant(1), levelsAboveBase()),
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-gaseous-form",
              artifactId: "gaseous-form",
              target: "target:cast",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "三环施法对一个 touch 声明目标生效，每升一环可多声明一个目标；只消耗一个所声明环位的法术位",
    "目标只保留 10 ft fly movement 并获得 hover，其他移动方式归零",
    "目标获得对钝击、穿刺与挥砍伤害的抗性（2024 收窄口径），并对倒地状态免疫",
    "目标不会获得 2014 的力量/敏捷/体质豁免优势（2024 已删除该条款）",
    "目标的攻击与施法 action 被 turn-context 隐藏，旧 action id 与直接 Midi workflow 同样被阻止",
    "非目标不变；专注结束或一小时到期时清理全部目标效果并恢复原有动作、移动与抗性",
    "目标降至 0 HP 时清理该目标效果，最后一个目标结束时同步终止 source concentration",
    "「目标用魔法动作自解」保持明确 DM omission，不冒充已有自动 End Activity",
    "穿隙、进入其他生物空间、液体、说话与操纵物件仍明确交由 DM 裁定",
  ], { status: "compiler-passed" }),
});

export default gaseousForm;
