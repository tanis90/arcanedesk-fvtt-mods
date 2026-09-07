import {
  compilerAcceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  endSourceWhenLastDependentEnds,
  eventTarget,
  graphFragment,
  operation,
  predicate,
  publicAction,
  rule,
  selected,
  spellContract,
  trigger,
  whileSpellActive,
} from "../dsl.mjs";

const EXPANSION_BATCH =
  "docs/foundry-automation/notes/零至三环新法术扩展批次.md";

const phantasmalForce = cleanRoomSpell({
  id: "phantasmal-force",
  contract: spellContract({
    ruleset: "2014",
    level: 2,
    school: "ill",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "目标必须是施法者可见的 creature，且本法术对 undead 与 construct 无效；visible predicate 目前只进入 interaction projection，同时缺少 closed negative creature-type predicate，因此由 DM 在声明目标时确认",
      "幻象的具体内容、尺寸、感官表现与目标如何合理化矛盾均由 DM 描述和裁定；自动化不创建 token、模板或场景实体",
      "目标使用动作进行 Investigation check 对抗施法 DC 并在成功时识破幻象的流程由 DM 处理和清理 marker",
      "幻象每轮至多造成 1d6 psychic damage、目标是否把幻象视作危险以及 5 ft 距离条件均由 DM 裁定，不自动造成伤害",
    ],
  },
  fragments: [
    graphFragment({
      id: "phantasmal-force-graph",
      actions: [publicAction("cast", "魅影之力 Phantasmal Force")],
      artifacts: [
        cleanRoomEffect("phantasmal-force", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Phantasmal Force",
          img: "systems/dnd5e/icons/svg/statuses/marked.svg",
          markerOnly: true,
          modifiers: [],
          sourceTermination: endSourceWhenLastDependentEnds(),
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-phantasmal-force",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            selected("target:cast", {
              min: 1,
              max: 1,
              range: 60,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["int"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "initial-save-failed",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "apply-phantasmal-force",
              artifactId: "phantasmal-force",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: compilerAcceptance(EXPANSION_BATCH, [
    "一个施法者可见、在 60 ft 内且由 DM 确认为非 undead/construct 的声明目标进行 Intelligence save，并只消耗一个二环或更高法术位",
    "只有首次豁免失败的目标获得唯一来源绑定且不附加伪状态的 Phantasmal Force marker；成功目标不改变",
    "施法建立最长一分钟的专注；解除或替换专注、固定持续时间结束时移除 marker；DM 判定识破并显式移除唯一 marker 时同步结束本次来源专注",
    "marker 不代表已经创建幻象实体、自动造成 1d6 psychic damage 或自动完成 Investigation check",
  ]),
});

export default phantasmalForce;
