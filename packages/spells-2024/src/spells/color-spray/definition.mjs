import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  consume,
  duration,
  eventTarget,
  grantStatus,
  graphFragment,
  instant,
  operation,
  placedTemplate,
  publicAction,
  rule,
  spellContract,
  spellLifetime,
  trigger,
  untilTrigger,
} from "@arcanedesk/spell-compiler/dsl";

// L2 重写批（2024，M1 审计 C 桶 recipe-invalid）：删除 6d10 生命值池筛选，改为
// 15 ft 锥状区域全员体质豁免、失败直接目盲至下个你的回合结束。
// 来源：5R 玩家手册2024 1环.htm#Color_Spray。
const colorSpray = cleanRoomSpell({
  id: "color-spray",
  contract: spellContract({
    ruleset: "2024",
    level: 1,
    school: "ill",
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
      "锥状模板的 15 ft 覆盖与成员只有 XY 几何保证；高度、遮挡与视线由 DM 调整",
      "「至下个你的回合结束」以施法者 turn-end next-after-created 脉冲为界；跨场景或回合顺序被手动篡改时的边界由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "color-spray-graph",
      actions: [publicAction("cast", "七彩喷射 Color Spray")],
      artifacts: [
        cleanRoomEffect("color-spray-blinded", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Color Spray",
          modifiers: [grantStatus("blinded")],
          lifecycle: untilTrigger(
            trigger("turn-end", {
              subject: "source",
              occurrence: "next-after-created",
            }),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-color-spray",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "cone",
              size: 15,
              range: null,
              rangeUnits: "self",
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("saving-throw", {
              id: "cast:save",
              ability: ["con"],
              target: "target:cast",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "cast-color-spray-failed",
          on: trigger("operation-outcome", {
            operationId: "cast:save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:failed")],
          do: [
            operation("apply-artifact", {
              id: "cast:apply-blinded",
              artifactId: "color-spray-blinded",
              target: "target:failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "DM 从施法者位置确定一个 15-ft cone，并由同一 workflow 快照模板内 creature；一次施法只消耗一个法术位",
    "模板内每名 creature 进行 Constitution save；成功不改变，失败获得独立 source-target identity 的 blinded",
    "2024 不再掷 6d10 生命值池、也不按当前 HP 筛选或跳过目标；所有失败目标一律目盲",
    "blinded 在施法者下一回合结束时精确移除；结算后删除瞬时 measured template，且不建立专注",
    "模板外的非目标不变，锥状区域的高度与遮挡保持明确 DM omission",
  ], { status: "compiler-passed" }),
});

export default colorSpray;
