import {
  acceptance,
  artifact,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  eventTarget,
  graphFragment,
  operation,
  perSlotAboveBase,
  placedTemplate,
  predicate,
  publicAction,
  rule,
  spellContract,
  trigger,
  whileArtifact,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const QA_LOG =
  "docs/foundry-automation/notes/spell-level-5-wave-i3-qa-2026-08-26.md";

const plagueDamage = perSlotAboveBase(
  dice(4, 10),
  dice(1, 10),
);

const oncePerTurnPhase = () => predicate("once-per-turn", {
  identity: "zoneInstanceId + targetUuid + turn + phase",
});

const membershipGuard = () => predicate("artifact-exists", {
  artifactId: "insect-plague-membership",
  subject: "effect-target",
});

const zonePulse = ({ id, on, targetId, includeMembershipGuard = false }) =>
  rule({
    id,
    on,
    when: [
      ...(includeMembershipGuard ? [membershipGuard()] : []),
      oncePerTurnPhase(),
    ],
    targets: [eventTarget(targetId)],
    do: [
      operation("saving-throw", {
        id: `${id}:save`,
        ability: ["con"],
        target: targetId,
        onSave: "half",
      }),
      operation("damage", {
        id: `${id}:damage`,
        target: targetId,
        formula: plagueDamage,
        damageTypes: ["piercing"],
        onSave: "half",
      }),
    ],
  });

const insectPlague = cleanRoomSpell({
  id: "insect-plague",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "区域是 difficult terrain；当前 DSL/runtime 不按 creature 穿越区域的实际路径增加移动消耗，由 DM 处理",
      "区域是 lightly obscured；当前 membership marker 不修改视线、攻击或可见性规则，由 DM 处理",
      "2014 RAW 的球体会绕过拐角扩散；当前模板/provider 不精确表达绕角、墙体与 line-of-effect 成员关系，由 DM 调整合法成员",
      "ActiveAuras measured-template membership 只保证 XY 平面；20-ft-radius sphere 的高度、elevation 与三维成员关系由 DM 处理",
    ],
  },
  fragments: [
    graphFragment({
      id: "insect-plague-zone-graph",
      actions: [
        publicAction("cast", "放置疫病虫群 Place Insect Plague"),
      ],
      artifacts: [
        artifact({
          id: "insect-plague-zone",
          kind: "zone",
          role: "mechanical",
          identity: { scope: "cast", keys: ["castId"] },
          state: {
            anchor: "placed-point",
            shape: { type: "sphere", radius: 20, units: "ft" },
            stationary: true,
          },
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("insect-plague-membership", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Insect Plague Area",
          markerOnly: true,
          lifecycle: whileArtifact("insect-plague-zone"),
        }),
      ],
      rules: [
        rule({
          id: "cast-insect-plague",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [
            placedTemplate("target:cast", {
              type: "sphere",
              size: 20,
              range: 300,
              evaluation: "snapshot",
            }),
          ],
          do: [
            consume(),
            operation("create-artifact", {
              id: "cast:create-zone",
              artifactId: "insect-plague-zone",
              target: "target:cast",
            }),
            operation("saving-throw", {
              id: "initial-save",
              ability: ["con"],
              target: "target:cast",
              onSave: "half",
            }),
            operation("damage", {
              id: "initial-damage",
              target: "target:cast",
              formula: plagueDamage,
              damageTypes: ["piercing"],
              onSave: "half",
            }),
          ],
        }),
        zonePulse({
          id: "insect-plague-entry",
          on: trigger("enter", { zoneId: "insect-plague-zone" }),
          targetId: "target:entry",
        }),
        zonePulse({
          id: "insect-plague-turn-end",
          on: trigger("turn-end", { subject: "zone-member" }),
          targetId: "target:turn-end",
          includeMembershipGuard: true,
        }),
      ],
    }),
  ],
  accepted: acceptance(QA_LOG, [
    "Cast 是 placed-template public Activity；DM 在施法者 300 ft 内放置一个 20-ft-radius 固定球形区域，一次调用只消费一个五环或更高法术位并建立最长 10 分钟专注",
    "区域出现时，模板快照内每个 creature 进行 Constitution save；失败承受 4d10 piercing damage，成功承受一半，区域外非目标保持不变",
    "creature 每回合首次进入区域时进行同一来源 DC 的 Constitution save；失败承受 4d10 piercing damage，成功半伤",
    "区域成员在自己的回合结束时进行同一来源 DC 的 Constitution save；失败承受 4d10 piercing damage，成功半伤",
    "entry 与 turn-end 使用 zoneInstanceId + targetUuid + turn + phase 分相 receipt；同一区域、目标和回合的每个相位至多结算一次，而合法的 entry 与 turn-end 可以各结算一次",
    "每高于五环一环，初始、entry 与 turn-end 三条结算都增加 1d10 piercing damage，并继承首次施法的实际环位",
    "结束、替换或到期结束专注时按 cast identity 删除区域模板与成员 marker；不同施法来源的模板、成员与 receipt 相互隔离",
    "difficult terrain、lightly obscured、绕角/墙体及三维成员关系保持明确 DM omission，不以速度修改、视觉状态或二维模板冒充完整支持",
  ], { status: "compiler-runtime-passed" }),
});

export default insectPlague;
