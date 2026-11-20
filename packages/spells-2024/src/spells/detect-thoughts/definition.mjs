import {
  QA_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  eventTarget,
  graphFragment,
  operation,
  predicate,
  publicAction,
  requiresSourceArtifact,
  rule,
  selected,
  self,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

// L3 新写批（无 2014 recipe）：5R 玩家手册2024/法术详述/2环.htm#Detect_Thoughts。
// 自动化等级：专注 + 阅读入口 + 深层探测的感知豁免；场景思想扫描与豁免成功后的终止由 DM 执行。
const detectThoughts = cleanRoomSpell({
  id: "detect-thoughts",
  contract: spellContract({
    ruleset: "2024",
    level: 2,
    school: "div",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 0.01,
      consumed: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "感知思想（30 ft 内知晓语言或能心灵感应的思想存在）不扫描场景：系统只产生施法卡与专注标记，存在性由 DM 口述",
      "阅读思想必须针对同一个先前的目标，深层探测也针对该目标：DSL 不能把多个 gated action 绑定到同一目标，由 DM 保证一致性",
      "深层探测的感知豁免成功时法术终止：DSL 不能把 gated selected-target workflow 与来源专注结束原子组合，DM 在豁免成功时手动结束专注",
      "无论豁免结果，目标都会知道你正在窥探，且可以用动作进行一次智力（奥秘）检定对抗你的法术豁免 DC，胜出则法术终止：由 DM 记录与结算",
      "目标不知晓任何语言且不能心灵感应时阅读思想得不到信息，由 DM 判断",
      "1 尺厚岩石/泥土/木头、1 寸厚金属或薄层铅的阻隔由 DM 判断",
      "1 铜币材料只写入 contract，不自动扣库存",
    ],
  },
  fragments: [
    graphFragment({
      id: "detect-thoughts-graph",
      actions: [
        publicAction("cast", "侦测思想 Detect Thoughts"),
        publicAction("read-thoughts", "侦测思想：阅读思想 Detect Thoughts: Read Thoughts", {
          availableWhen: [requiresSourceArtifact("detect-thoughts-sense")],
        }),
        publicAction("probe-thoughts", "侦测思想：深入探测 Detect Thoughts: Probe", {
          availableWhen: [requiresSourceArtifact("detect-thoughts-sense")],
        }),
      ],
      artifacts: [
        cleanRoomEffect("detect-thoughts-sense", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Detect Thoughts",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("detect-thoughts-probed", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Detect Thoughts: Probe Failed Save",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-detect-thoughts",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-sense",
              artifactId: "detect-thoughts-sense",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "read-detect-thoughts",
          on: trigger("action-used", { actionId: "read-thoughts" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "detect-thoughts-sense",
              subject: "source",
            }),
          ],
          targets: [
            selected("target:read", {
              min: 1,
              max: 1,
              range: 30,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [],
        }),
        rule({
          id: "probe-detect-thoughts",
          on: trigger("action-used", { actionId: "probe-thoughts" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "detect-thoughts-sense",
              subject: "source",
            }),
          ],
          targets: [
            selected("target:probe", {
              min: 1,
              max: 1,
              range: 30,
              kind: "creature",
              predicates: [predicate("visible-to-source")],
            }),
          ],
          do: [
            operation("saving-throw", {
              id: "probe:save",
              ability: ["wis"],
              target: "target:probe",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "probe-failed-save",
          on: trigger("operation-outcome", {
            operationId: "probe:save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:probe-failed")],
          do: [
            operation("apply-artifact", {
              id: "probe:apply-marker",
              artifactId: "detect-thoughts-probed",
              target: "target:probe-failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Cast 是 action，在施法者身上建立最长 1 分钟的专注与 Detect Thoughts 来源标记，只消耗一个二环或更高法术位",
    "Read Thoughts 只在标记存续时可见可用，选择一个 30 ft 内由 DM 确认为可见的 creature 并产生聊天卡，不进行豁免、不创建 Effect",
    "Probe 同样受标记门控，对 30 ft 内一个可见 creature 进行 Wisdom 豁免；豁免失败时只建立无修饰的 source-target 标记记录已深入读取",
    "豁免成功时法术终止由 DM 手动结束专注；目标知晓窥探与其后的智力（奥秘）对抗检定同样由 DM 结算",
    "解除、替换或到期结束专注时精确清理本来源标记；同来源重施只替换自己的标记",
    "场景思想扫描、阻隔规则与 1 铜币材料保持明确 omission",
  ], { status: "compiler-passed" }),
});

export default detectThoughts;
