import {
  QA_LOG,
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  contentRef,
  duration,
  graphFragment,
  operation,
  placedTemplate,
  predicate,
  publicAction,
  requiresSourceArtifact,
  rule,
  selected,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const graspingVine = cleanRoomSpell({
  id: "grasping-vine",
  contract: spellContract({
    ruleset: "2014",
    level: 4,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  content: contentRef("grasping-vine"),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "Cast 的 30-ft placed circle 只负责创建锚点与二维范围提示；DM 在放置时确认模板中心是施法者 30 ft 内可见且未被占据的地面",
      "Vine Lash 的 selected creature Activity 明确使用 range:null，且不以 membership 或 artifact-point 自动 gate；DM 在调用前确认目标距藤蔓锚点 30 ft 内并且施法者可见目标",
      "Dexterity save 失败后的 20 ft 拉动不自动执行；DM 将目标沿直线朝藤蔓手动移动，若先到藤蔓或遇到合法阻挡则提前停止",
      "施法时的可选首次 Lash 与 Cast 属于同一个 bonus action，但 agent 仍按 Cast、重读 turn-context、Lash 两次 execute-turn 串行调用；后续 Lash 保留 bonus-action metadata。Runtime 不记账首次例外，也不硬拒绝施法回合的额外 Lash，DM/agent 负责 action economy 与每回合至多一次",
    ],
  },
  fragments: [
    graphFragment({
      id: "grasping-vine-graph",
      actions: [
        publicAction("cast", "擒抱藤 Grasping Vine", {
          activationType: "bonus",
        }),
        publicAction("lash", "擒抱藤：藤蔓抽击 Vine Lash", {
          activationType: "bonus",
          availableWhen: [requiresSourceArtifact("grasping-vine-source")],
        }),
      ],
      artifacts: [
        cleanRoomEffect("grasping-vine-source", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Grasping Vine",
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
        artifact({
          id: "grasping-vine-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "circle", radius: 30, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("grasping-vine-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "【系统】擒抱藤：30尺抽击范围（勿删）",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileArtifact("grasping-vine-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-grasping-vine",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "circle",
              size: 30,
              range: 30,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-source",
              artifactId: "grasping-vine-source",
              target: "source",
            }),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "grasping-vine-zone",
              target: "target:cast",
            }),
          ],
        }),
        rule({
          id: "lash-grasping-vine",
          on: trigger("action-used", { actionId: "lash" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "grasping-vine-source",
              subject: "source",
            }),
          ],
          targets: [
            selected("target:lash", {
              min: 1,
              max: 1,
              range: null,
              units: "ft",
              kind: "creature",
            }),
          ],
          do: [
            operation("saving-throw", {
              id: "lash-save",
              ability: ["dex"],
              target: "target:lash",
              onSave: "none",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Cast 是 bonus action，DM 在施法者 30 ft 内放置一个 30-ft-radius circle；法术保留 V/S、最长一分钟专注，并且只消费一个四环或更高法术位",
    "Cast 创建 cast-scoped stationary static zone、一个 whileSpellActive source Effect 和恰好一个 source-target marker-only membership；区域没有 enter、leave、turn-start 或 turn-end pulse",
    "Vine Lash 只在 grasping-vine-source 存续时可用；来源因专注结束、替换或到期而消失时，Lash 硬拒绝，并清理对应 zone template 与 membership",
    "Vine Lash 是 bonus-action selected creature Activity，其 range override 为 null；每次只执行使用原施法 DC 的 Dexterity save，不消耗法术位，不生成 attack、damage、自动移动、目标 Effect 或升环增强",
    "DM 在每次 Lash 前确认目标距藤蔓锚点 30 ft 内且施法者可见；失败后手动朝锚点直线拉动最多 20 ft，先到藤蔓或遇到合法阻挡时提前停止",
    "Cast-only 可以不声明首次目标；施法并首次抽击时，agent 依次执行 Cast、重读 turn-context、再执行 Lash，两次调用均 advance=false。首次 Lash 计入 Cast 的同一个 bonus action，后续回合的 Lash 才各自占用 bonus action，该 action-economy 纪律由 DM/agent 裁决",
    "首次或后续 Lash 的成功与失败都产生真实 Midi Dexterity save workflow；结果不明确时不重放 Cast 或 Lash，不回滚已消费的法术位、专注来源和锚点，由 DM 接管该次可选抽击",
  ], { status: "compiler-runtime-passed" }),
});

export default graspingVine;
