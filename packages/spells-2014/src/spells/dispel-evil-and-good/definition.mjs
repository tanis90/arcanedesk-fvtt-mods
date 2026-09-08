import {
  acceptance,
  cleanRoomEffect,
  cleanRoomSpell,
  concentration,
  consume,
  duration,
  eventTarget,
  grantIncomingAttackDisadvantage,
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

const L5_WAVE_I2_QA_RECEIPT =
  "docs/foundry-automation/notes/spell-level-5-wave-i2-qa-2026-08-26.md";

const protectedCreatureTypes = [
  "celestial",
  "elemental",
  "fey",
  "fiend",
  "undead",
];

const dispelEvilAndGood = cleanRoomSpell({
  id: "dispel-evil-and-good",
  contract: spellContract({
    ruleset: "2014",
    level: 5,
    school: "abj",
    components: {
      verbal: true,
      somatic: true,
      material: true,
    },
    material: {
      cost: 0,
      consumed: false,
    },
    lifetime: concentration(duration(1, "minutes")),
  }),
  emission: { contentVersion: 1 },
  support: {
    level: "simplified",
    omissions: [
      "对 charmed/frightened 的来源条件免疫、已受影响时后续豁免优势及防止 possession 都要求识别 celestial、elemental、fey、fiend 或 undead 来源；系统不把它们宽化为无条件免疫，由 DM 按来源裁定",
      "Break Enchantment 的合法来源与 touch 资格由 DM 在调用前确认；系统只移除目标可稳定识别的 structured charmed/frightened status，不能移除 possession 或无结构化状态的来源效果，也不区分同一状态的具体施加来源",
      "Dismissal 的目标类型、目标是否位于原生位面、失败后的跨位面移动及 undead/fey 的特殊目的地由 DM 处理；失败 marker 只记录待处理结果，不移动、隐藏或控制 Token",
      "2014 RAW 在使用 Break Enchantment 或 Dismissal 后结束法术；当前 DSL 不能把 gated selected-target workflow 与来源专注结束原子组合。Break Enchantment 完成后，DM 立即通过受信 Foundry UI 结束本次专注；Dismissal 豁免失败时，DM 先依据临时 marker 完成跨位面处理，再立即结束本次专注，来源清理会同时删除 marker",
    ],
  },
  fragments: [
    graphFragment({
      id: "dispel-evil-and-good-graph",
      actions: [
        publicAction("cast", "反制善恶 Dispel Evil and Good"),
        publicAction(
          "break-enchantment",
          "反制善恶：破除惑控 Break Enchantment",
          {
            availableWhen: [
              requiresSourceArtifact("dispel-evil-and-good-protection"),
            ],
          },
        ),
        publicAction("dismissal", "反制善恶：遣返 Dismissal", {
          availableWhen: [
            requiresSourceArtifact("dispel-evil-and-good-protection"),
          ],
        }),
      ],
      artifacts: [
        cleanRoomEffect("dispel-evil-and-good-protection", {
          host: "actor",
          scope: "source",
          reapply: "replace",
          name: "Dispel Evil and Good: Protection",
          modifiers: [
            grantIncomingAttackDisadvantage({
              attackerCreatureTypes: protectedCreatureTypes,
            }),
          ],
          lifecycle: whileSpellActive(),
        }),
        cleanRoomEffect("dismissal-failed", {
          host: "actor",
          scope: "source-target",
          reapply: "replace",
          name: "Dispel Evil and Good: Dismissal Failed Save",
          markerOnly: true,
          modifiers: [],
          lifecycle: whileSpellActive(),
        }),
      ],
      rules: [
        rule({
          id: "cast-dispel-evil-and-good",
          on: trigger("action-used", { actionId: "cast" }),
          targets: [self("target:cast")],
          do: [
            consume(),
            operation("apply-artifact", {
              id: "cast:apply-protection",
              artifactId: "dispel-evil-and-good-protection",
              target: "source",
            }),
          ],
        }),
        rule({
          id: "break-enchantment",
          on: trigger("action-used", { actionId: "break-enchantment" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "dispel-evil-and-good-protection",
              subject: "source",
            }),
          ],
          targets: [
            selected("target:break-enchantment", {
              min: 1,
              max: 1,
              range: null,
              units: "touch",
              kind: "creature",
            }),
          ],
          do: [
            operation("remove-statuses", {
              id: "break-enchantment:remove-statuses",
              target: "target:break-enchantment",
              statuses: ["charmed", "frightened"],
            }),
          ],
        }),
        rule({
          id: "dismissal-attack",
          on: trigger("action-used", { actionId: "dismissal" }),
          when: [
            predicate("artifact-exists", {
              artifactId: "dispel-evil-and-good-protection",
              subject: "source",
            }),
          ],
          targets: [
            selected("target:dismissal", {
              min: 1,
              max: 1,
              range: 5,
              kind: "creature",
            }),
          ],
          do: [
            operation("attack-roll", {
              id: "dismissal:attack",
              target: "target:dismissal",
              attack: {
                source: "spellcasting",
                range: "melee",
              },
            }),
          ],
        }),
        rule({
          id: "dismissal-save-after-hit",
          on: trigger("operation-outcome", {
            operationId: "dismissal:attack",
            outcome: "hit",
          }),
          targets: [eventTarget("target:dismissal-hit")],
          do: [
            operation("saving-throw", {
              id: "dismissal:save",
              ability: ["cha"],
              target: "target:dismissal-hit",
              onSave: "none",
            }),
          ],
        }),
        rule({
          id: "dismissal-marker-after-failed-save",
          on: trigger("operation-outcome", {
            operationId: "dismissal:save",
            outcome: "failure",
          }),
          targets: [eventTarget("target:dismissal-failed")],
          do: [
            operation("apply-artifact", {
              id: "dismissal:apply-failed-marker",
              artifactId: "dismissal-failed",
              target: "target:dismissal-failed",
            }),
          ],
        }),
      ],
    }),
  ],
  accepted: acceptance(L5_WAVE_I2_QA_RECEIPT, [
    "Cast 是 self Action，只消耗一个五环或更高法术位，并在施法者身上建立最长一分钟的专注 protection Effect",
    "celestial、elemental、fey、fiend 与 undead 的攻击对 protection 宿主具有劣势；aberration 与其他未列类型不受影响，系统不把 charmed/frightened 防护宽化为无条件免疫",
    "Break Enchantment 只在精确 protection Effect 存续时可见可用，选择一个由 DM 声明合法的 touch creature，不再次消耗法术位，并只移除 structured charmed/frightened status；非目标及无关状态和 mechanical changes 不变",
    "Dismissal 只在精确 protection Effect 存续时可见可用，对 5 ft 内一个由 DM 声明合法的 creature 进行真实 melee spell attack；miss 不触发豁免，hit 后进行一次 Charisma save，且不再次消耗法术位",
    "Dismissal 的 Charisma save 失败时只建立具有 source-target identity、无 status 与 modifier 的临时 marker；成功目标、miss 目标与非目标不获得 marker，不自动移动、隐藏或控制 Token",
    "Break Enchantment 完成后，或 Dismissal 的跨位面处理完成后，DM 立即通过受信 Foundry UI 结束本次专注；来源清理同时删除 protection 与临时 Dismissal marker，且两个 gated Action 都从 turn-context 隐藏",
    "角色卡 UI 与 battle-context -> turn-context -> execute-turn 对 Cast、Break Enchantment 与 Dismissal 分别使用同一个 compiler-emitted Activity，并由 L5-I2 Runtime QA receipt 记录双入口与状态证据",
  ], { status: "compiler-runtime-passed" }),
});

export default dispelEvilAndGood;
