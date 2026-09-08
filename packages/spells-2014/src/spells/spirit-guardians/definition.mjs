import {
  COMPILER_MIGRATION_LOG,
  acceptance,
  cleanRoomEffect,
  cleanRoomFollowingAura,
  cleanRoomSpell,
  concentration,
  consume,
  dice,
  duration,
  eventTarget,
  graphFragment,
  halveAllMovement,
  operation,
  perSlotAboveBase,
  predicate,
  publicAction,
  rule,
  self,
  spellContract,
  trigger,
  whileSpellActive,
} from "@arcanedesk/spell-compiler/dsl";

const guardiansDamage = perSlotAboveBase(
  dice(3, 8),
  dice(1, 8),
);

const oncePerTurn = () => predicate("once-per-turn", {
  identity: "auraInstanceId + targetUuid + turn",
});

const spiritGuardians = cleanRoomSpell({
  id: "spirit-guardians",
  contract: spellContract({
    ruleset: "2014",
    level: 3,
    school: "con",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    lifetime: concentration(duration(10, "minutes")),
  }),
  emission: { contentVersion: 5 },
  support: {
    level: "simplified",
    omissions: [
      "施法时可指定任意数量可见生物不受影响，按桌面默认策略简化为友军全部排除、敌军全部受影响；neutral 不自动纳入，且不逐个记录施法时的可见性选择",
      "伤害类型固定为 radiant；邪恶施法者可改用 necrotic 的选择仍由 DM 处理",
      "多个不同环位的同名灵体卫士重叠时，Aura Effects 只保留一个非叠加成员效果；当前不自动比较施法环位，最强来源由 DM 裁定",
    ],
  },
  fragments: [
    graphFragment({
      id: "spirit-guardians-graph",
      actions: [
        publicAction("cast", "召唤灵体卫士 Summon Spirit Guardians"),
      ],
      artifacts: [
        cleanRoomEffect("guardians-aura-effect", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Spirit Guardians",
          modifiers: [
            halveAllMovement(),
          ],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomFollowingAura("guardians-aura", {
          sourceArtifactId: "guardians-aura-effect",
          radius: 15,
          recipientPolicy: "opposing-disposition",
          includeSelf: false,
          color: "#facc15",
          opacity: 0.22,
        }),
      ],
      rules: [
        rule({
          id: "cast-spirit-guardians",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-guardians",
              artifactId: "guardians-aura-effect",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "guardians-entry",
          on: trigger("enter", { zoneId: "guardians-aura-effect" }),
          when: [
            oncePerTurn(),
          ],
          targets: [eventTarget("target:entry")],
          do: [
            operation("saving-throw", {
              id: "entry-save",
              ability: ["wis"],
              target: "target:entry",
              onSave: "half",
            }),
            operation("damage", {
              id: "entry-damage",
              target: "target:entry",
              formula: guardiansDamage,
              damageTypes: ["radiant"],
              onSave: "half",
            }),
          ],
        }),
        rule({
          id: "guardians-turn-start",
          on: trigger("turn-start", { subject: "aura-member" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "guardians-aura-effect",
              subject: "effect-target",
            }),
            oncePerTurn(),
          ],
          targets: [eventTarget("target:turn")],
          do: [
            operation("saving-throw", {
              id: "turn-save",
              ability: ["wis"],
              target: "target:turn",
              onSave: "half",
            }),
            operation("damage", {
              id: "turn-damage",
              target: "target:turn",
              formula: guardiansDamage,
              damageTypes: ["radiant"],
              onSave: "half",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(
    COMPILER_MIGRATION_LOG,
    [
      "self cast 只消耗一个三环或更高环位的法术位，并建立最长十分钟的专注",
      "15-ft 光环跟随施法者，只向敌对 token 动态传播减速效果；施法者、友军、neutral 与超距 token 不受影响",
      "光环成员的所有移动方式减半，离开范围时自动移除；重新进入只恢复一个来源绑定效果",
      "施法时已在范围内的敌人立即减速但不立即受伤；其后首次进入一回合或在区域内开始回合时进行 Wisdom save",
      "失败承受 3d8 radiant damage、成功承受一半，每升一环增加 1d8；进入与回合开始共享同一来源、目标和回合的去重 receipt",
      "不同施法来源相互隔离；结束或替换一名施法者的专注只清理该来源的光环、成员效果与范围提示",
    ],
    { status: "compiler-runtime-passed" },
  ),
});

export default spiritGuardians;
