import {
  QA_LOG,
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  eventTarget,
  grantStatus,
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

// L4 移植批（G 桶，非 SRD，spells24 无源文档）：2014 recipe 搬运改契约。
// 5R 锚点 Grasping_Vine（4环.htm）：头部 四环 咒法（德鲁伊、游侠），V/S，附赠，60尺，专注1分钟。
// 与 2014 差异：5R 藤鞭为近战法术攻击、命中 4d8 钝击并擒抱（2014 recipe 误用敏捷豁免且无伤害），按 5R 重写。
const graspingVine = cleanRoomSpell({
  id: "grasping-vine",
  contract: spellContract({
    ruleset: "2024",
    level: 4,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "Cast 的 30-ft placed circle 只负责创建藤蔓锚点与抽击范围提示；DM 在放置时确认模板中心是施法者 60 ft 内可见且未被占据的空间",
      "Vine Lash 的 selected creature Activity 明确使用 range:null，且不以 membership 或 artifact-point 自动 gate；DM 在调用前确认目标距藤蔓锚点 30 ft 内",
      "命中后的 30 ft 拉动不自动执行；DM 将目标沿直线朝藤蔓手动移动，若先到藤蔓或遇到合法阻挡则提前停止",
      "擒抱资格（体型不超过巨型）与逃脱 DC 的 action 解除流程不校验：命中即施加 grappled marker，体型资格、拉动落点与解除由 DM 裁定",
      "升环施法每高环可多擒抱一名 creature 的名额不建模；每次 Lash 的实际名额由 DM 掌握",
      "施法时的可选首次 Lash 与 Cast 属于同一个 bonus action，但 agent 仍按 Cast、重读 turn-context、Lash 两次 execute-turn 串行调用；后续 Lash 保留 bonus-action metadata",
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
        cleanRoomEffect("grasping-vine-grappled", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Grasping Vine",
          modifiers: [grantStatus("grappled")],
          lifecycle: whileSpellActive(),
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
              range: 60,
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
            operation("attack-roll", {
              id: "lash:attack",
              target: "target:lash",
              attack: {
                source: "spellcasting",
                range: "melee",
              },
            }),
            operation("damage", {
              id: "lash:damage",
              target: "target:lash",
              formula: dice(4, 8),
              damageTypes: ["bludgeoning"],
            }),
          ],
        }),
        rule({
          id: "lash-hit-grapple",
          on: trigger("operation-outcome", {
            operationId: "lash:attack",
            outcome: "hit",
          }),
          targets: [eventTarget("target:hit")],
          do: [
            operation("apply-artifact", {
              id: "hit:apply-grappled",
              artifactId: "grasping-vine-grappled",
              target: "target:hit",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Cast 是 bonus action，DM 在施法者 60 ft 内放置一个 30-ft-radius circle 作为藤蔓锚点与抽击范围；法术保留 V/S、最长一分钟专注，只消费一个四环或更高法术位",
    "Vine Lash 只在 grasping-vine-source 存续时可用，是 bonus-action selected creature Activity，range override 为 null",
    "Lash 对声明目标进行 melee spell attack；命中造成 4d8 bludgeoning，并在目标上施加来源绑定的 grappled marker",
    "Lash 不消耗法术位，也不生成第二个来源或区域；未命中不造成伤害也不施加 grappled",
    "专注结束、替换或到期时清理 source、zone 与全部本次来源的 grappled marker",
    "30 ft 拉动、体型资格、逃脱 DC 与升环额外擒抱名额保持明确 omission，不误报为已实现",
  ], { status: "compiler-passed" }),
});

export default graspingVine;
