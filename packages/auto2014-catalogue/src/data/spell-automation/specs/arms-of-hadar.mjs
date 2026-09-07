import {
  QA_LOG,
  acceptance,
  blockActionKinds,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  dice,
  eventTarget,
  excludeSource,
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
  untilTrigger,
} from "../dsl.mjs";

const armsOfHadar = cleanRoomSpell({
  id: "arms-of-hadar",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: spellLifetime(instant()),
  }),
  emission: { contentVersion: 1 },
  support: { level: "full", omissions: [] },
  fragments: [
    graphFragment({
      id: "arms-of-hadar-graph",
      actions: [
        publicAction("cast", "哈达之臂 Arms of Hadar"),
      ],
      artifacts: [
        cleanRoomEffect("arms-of-hadar-no-reactions", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Arms of Hadar: No Reactions",
          modifiers: [
            blockActionKinds(["reaction"]),
          ],
          lifecycle: untilTrigger(
            trigger("turn-start", { subject: "effect-target" }),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-arms-of-hadar",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "radius",
              size: 10,
              range: null,
              rangeUnits: "self",
              predicates: [excludeSource()],
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["str"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-damage",
              target: "target:cast",
              formula: perSlotAboveBase(
                dice(2, 6),
                dice(1, 6),
              ),
              damageTypes: ["necrotic"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "arms-of-hadar-save-failed",
          on: trigger("operation-outcome", {
            operationId: "initial-save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "apply-no-reactions",
              artifactId: "arms-of-hadar-no-reactions",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "一个 range=self 的 10-ft radius 以施法者为中心，并由同一 workflow 快照区域内除施法者以外的 creature",
    "区域成员进行 Strength save；失败承受 2d6 necrotic damage，成功承受一半，每升一环增加 1d6",
    "只有失败者获得来源绑定的 no-reactions Effect，且不能采取 reaction 直到其下一回合开始",
    "成功者不获得 no-reactions Effect",
    "一次施法只消耗一个明确声明的一环或更高法术位，不建立专注或持续区域",
  ], { status: "compiler-runtime-passed" }),
});

export default armsOfHadar;
