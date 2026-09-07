import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  constant,
  consume,
  dice,
  duration,
  eventTarget,
  firstOf,
  graphFragment,
  increaseMovement,
  operation,
  predicate,
  publicAction,
  requiresSourceArtifact,
  rule,
  self,
  spellContract,
  trigger,
  untilTrigger,
  whileSpellActive,
} from "../dsl.mjs";

const zephyrStrike = cleanRoomSpell({
  id: "zephyr-strike",
  contract: spellContract({
    ruleset: "2014",
    level: 1,
    school: "trs",
    components: {
      verbal: true,
      somatic: false,
      material: false,
    },
    lifetime: concentration(duration(1, "minutes")),
    primaryActionId: "cast",
  }),
  emission: { contentVersion: 9 },
  support: {
    level: "simplified",
    omissions: [
      "持续期间移动不触发借机攻击仅保留来源 marker 提示，实际取消借机攻击仍由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "zephyr-strike-graph",
      actions: [
        publicAction("cast", "西风打击 Zephyr Strike", {
          activationType: "bonus",
        }),
        publicAction("boost", "西风打击：强化攻击 Zephyr Strike Boost", {
          activationType: "none",
          delivery: "declared-rider",
          availableWhen: [requiresSourceArtifact("zephyr-boost-ready")],
        }),
      ],
      artifacts: [
        cleanRoomEffect("zephyr-strike-marker", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Zephyr Strike",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("zephyr-boost-ready", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Zephyr Strike: Boost Ready",
          markerOnly: true,
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("zephyr-speed-boost", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Zephyr Strike: +30 ft Walking Speed",
          modifiers: [
            increaseMovement("walk", constant(30)),
          ],
          lifecycle: firstOf(
            duration(1, "rounds"),
            untilTrigger(trigger("turn-end", { subject: "current-turn" })),
          ),
        }),
      ],
      rules: [
        rule({
          id: "cast-zephyr-strike",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-marker",
              artifactId: "zephyr-strike-marker",
              target: "source",
            }),
            operation("apply-artifact", {
              id: "cast:apply-boost-ready",
              artifactId: "zephyr-boost-ready",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "configure-declared-boost",
          on: trigger("attack-roll-config"),
          when: [
            predicate("declared"),
            predicate("attack-kind", { value: "weapon" }),
            predicate("artifact-exists", {
              artifactId: "zephyr-boost-ready",
              subject: "source",
            }),
          ],
          do: [
            operation("grant-attack-advantage", {
              id: "boost:grant-advantage",
              target: "source",
              scope: "triggering-attack",
            }),
          ],
        }),
        rule({
          id: "resolve-declared-boost-hit",
          on: trigger("operation-outcome", {
            operationId: "external:triggering-weapon-attack",
            outcome: "hit",
          }),
          when: [
            predicate("declared"),
            predicate("attack-kind", { value: "weapon" }),
            predicate("artifact-exists", {
              artifactId: "zephyr-boost-ready",
              subject: "source",
            }),
          ],
          targets: [eventTarget("target:hit")],
          do: [
            operation("delete-artifact", {
              id: "boost:consume-ready-on-hit",
              artifactId: "zephyr-boost-ready",
              target: "source",
            }),
            operation("apply-artifact", {
              id: "boost:apply-speed-on-hit",
              artifactId: "zephyr-speed-boost",
              target: "source",
            }),
            operation("damage", {
              id: "boost:force-damage",
              target: "target:hit",
              formula: dice(1, 8),
              damageTypes: ["force"],
              properties: ["magical"],
              attachment: "triggering-attack",
            }),
          ],
        }),
        rule({
          id: "resolve-declared-boost-miss",
          on: trigger("operation-outcome", {
            operationId: "external:triggering-weapon-attack",
            outcome: "miss",
          }),
          when: [
            predicate("declared"),
            predicate("attack-kind", { value: "weapon" }),
            predicate("artifact-exists", {
              artifactId: "zephyr-boost-ready",
              subject: "source",
            }),
          ],
          do: [
            operation("delete-artifact", {
              id: "boost:consume-ready-on-miss",
              artifactId: "zephyr-boost-ready",
              target: "source",
            }),
            operation("apply-artifact", {
              id: "boost:apply-speed-on-miss",
              artifactId: "zephyr-speed-boost",
              target: "source",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(COMPILER_MIGRATION_LOG, [
    "bonus-action self cast 只消耗一个一环法术位并建立最长一分钟的专注、无借机攻击提示 marker 与 boost-ready",
    "DM 通过 triggering weapon attack 的 declaredRiders 明确声明 boost 后，该次攻击获得优势",
    "同一次已声明攻击命中时把基础 1d8 force 注入父伤害 roll，暴击骰由 Midi 统一处理",
    "同一次已声明攻击无论命中或未命中都只消费一次 boost-ready，并给施法者 +30 ft walking speed 到当前回合结束",
    "未声明 boost 的攻击不会消费 ready、获得优势、追加 force damage 或获得速度",
    "取消或替换专注时 Zephyr Strike marker 与尚未消费的 boost-ready 被清理；借机攻击免疫仍由 DM 处理",
  ], { status: "compiler-runtime-passed" }),
});

export default zephyrStrike;
