import { readdirSync } from "node:fs";
import hypnoticPattern from "./specs/hypnotic-pattern.mjs";
import auraOfVitality from "./specs/aura-of-vitality.mjs";
import cureWounds from "./specs/cure-wounds.mjs";
import bless from "./specs/bless.mjs";
import holdPerson from "./specs/hold-person.mjs";
import protectionFromEnergy from "./specs/protection-from-energy.mjs";
import brandingSmite from "./specs/branding-smite.mjs";
import armorOfAgathys from "./specs/armor-of-agathys.mjs";
import fireShield from "./specs/fire-shield.mjs";
import wardingBond from "./specs/warding-bond.mjs";
import silence from "./specs/silence.mjs";
import moonbeam from "./specs/moonbeam.mjs";
import mistyStep from "./specs/misty-step.mjs";
import guidingBolt from "./specs/guiding-bolt.mjs";
import faerieFire from "./specs/faerie-fire.mjs";
import light from "./specs/light.mjs";
import dancingLights from "./specs/dancing-lights.mjs";
import healingWord from "./specs/healing-word.mjs";
import prayerOfHealing from "./specs/prayer-of-healing.mjs";
import massHealingWord from "./specs/mass-healing-word.mjs";
import inflictWounds from "./specs/inflict-wounds.mjs";
import searingSmite from "./specs/searing-smite.mjs";
import thunderousSmite from "./specs/thunderous-smite.mjs";
import wrathfulSmite from "./specs/wrathful-smite.mjs";
import shieldOfFaith from "./specs/shield-of-faith.mjs";
import bane from "./specs/bane.mjs";
import lesserRestoration from "./specs/lesser-restoration.mjs";
import protectionFromPoison from "./specs/protection-from-poison.mjs";
import slow from "./specs/slow.mjs";
import blindnessDeafness from "./specs/blindnessdeafness.mjs";
import heroism from "./specs/heroism.mjs";
import hideousLaughter from "./specs/hideous-laughter.mjs";
import darkness from "./specs/darkness.mjs";
import sleep from "./specs/sleep.mjs";
import protectionFromEvilAndGood from "./specs/protection-from-evil-and-good.mjs";
import magicWeapon from "./specs/magic-weapon.mjs";
import inciteGreed from "./specs/incite-greed.mjs";
import lifeTransference from "./specs/life-transference.mjs";
import motivationalSpeech from "./specs/motivational-speech.mjs";
import spiritGuardians from "./specs/spirit-guardians.mjs";
import spiritShroud from "./specs/spirit-shroud-tce.mjs";
import command from "./specs/command.mjs";
import dissonantWhispers from "./specs/dissonant-whispers.mjs";
import divineFavor from "./specs/divine-favor.mjs";
import huntersMark from "./specs/hunters-mark.mjs";
import mirrorImage from "./specs/mirror-image.mjs";
import passWithoutTrace from "./specs/pass-without-trace.mjs";
import sanctuary from "./specs/sanctuary.mjs";
import zephyrStrike from "./specs/zephyr-strike.mjs";
import beaconOfHope from "./specs/beacon-of-hope.mjs";
import bestowCurse from "./specs/bestow-curse.mjs";
import enemiesAbound from "./specs/enemies-abound.mjs";
import gaseousForm from "./specs/gaseous-form.mjs";
import falseLife from "./specs/false-life.mjs";
import longstrider from "./specs/longstrider.mjs";
import acidArrow from "./specs/acid-arrow.mjs";
import darkvision from "./specs/darkvision.mjs";
import shatter from "./specs/shatter.mjs";
import intellectFortress from "./specs/intellect-fortress-tce.mjs";
import fly from "./specs/fly.mjs";
import daylight from "./specs/daylight.mjs";
import magicCircle from "./specs/magic-circle.mjs";
import crusadersMantle from "./specs/crusaders-mantle.mjs";
import guidance from "./specs/guidance.mjs";
import rayOfFrost from "./specs/ray-of-frost.mjs";
import sacredFlame from "./specs/sacred-flame.mjs";
import viciousMockery from "./specs/vicious-mockery.mjs";
import mindSpike from "./specs/mind-spike.mjs";
import boomingBladeTce from "./specs/booming-bladetce.mjs";
import aid from "./specs/aid.mjs";
import calmEmotions from "./specs/calm-emotions.mjs";
import acidSplash from "./specs/acid-splash.mjs";
import fireBolt from "./specs/fire-bolt.mjs";
import poisonSpray from "./specs/poison-spray.mjs";
import armsOfHadar from "./specs/arms-of-hadar.mjs";
import burningHands from "./specs/burning-hands.mjs";
import thunderwave from "./specs/thunderwave.mjs";
import conjureBarrage from "./specs/conjure-barrage.mjs";
import fireball from "./specs/fireball.mjs";
import lightningBolt from "./specs/lightning-bolt.mjs";
import chillTouch from "./specs/chill-touch.mjs";
import eldritchBlast from "./specs/eldritch-blast.mjs";
import produceFlame from "./specs/produce-flame.mjs";
import shockingGrasp from "./specs/shocking-grasp.mjs";
import thornWhip from "./specs/thorn-whip.mjs";
import tollTheDead from "./specs/toll-the-dead.mjs";
import chromaticOrb from "./specs/chromatic-orb.mjs";
import iceKnife from "./specs/ice-knife.mjs";
import magicMissile from "./specs/magic-missile.mjs";
import scorchingRay from "./specs/scorching-ray.mjs";
import bladeWard from "./specs/blade-ward.mjs";
import resistance from "./specs/resistance.mjs";
import trueStrike from "./specs/true-strike.mjs";
import jump from "./specs/jump.mjs";
import expeditiousRetreat from "./specs/expeditious-retreat.mjs";
import blur from "./specs/blur.mjs";
import invisibility from "./specs/invisibility.mjs";
import enlargereduce from "./specs/enlargereduce.mjs";
import shillelagh from "./specs/shillelagh.mjs";
import ensnaringStrike from "./specs/ensnaring-strike.mjs";
import hailOfThorns from "./specs/hail-of-thorns.mjs";
import hex from "./specs/hex.mjs";
import blindingSmite from "./specs/blinding-smite.mjs";
import elementalWeapon from "./specs/elemental-weapon.mjs";
import lightningArrows from "./specs/lightning-arrows.mjs";
import animalFriendship from "./specs/animal-friendship.mjs";
import charmPerson from "./specs/charm-person.mjs";
import colorSpray from "./specs/color-spray.mjs";
import rayOfSickness from "./specs/ray-of-sickness.mjs";
import crownOfMadness from "./specs/crown-of-madness.mjs";
import enthrall from "./specs/enthrall.mjs";
import phantasmalForce from "./specs/phantasmal-force.mjs";
import rayOfEnfeeblement from "./specs/ray-of-enfeeblement.mjs";
import fear from "./specs/fear.mjs";
import entangle from "./specs/entangle.mjs";
import fogCloud from "./specs/fog-cloud.mjs";
import cloudOfDaggers from "./specs/cloud-of-daggers.mjs";
import gustOfWind from "./specs/gust-of-wind.mjs";
import spikeGrowth from "./specs/spike-growth.mjs";
import web from "./specs/web.mjs";
import grease from "./specs/grease.mjs";
import plantGrowth from "./specs/plant-growth.mjs";
import witchBolt from "./specs/witch-bolt.mjs";
import heatMetal from "./specs/heat-metal.mjs";
import callLightning from "./specs/call-lightning.mjs";
import vampiricTouch from "./specs/vampiric-touch.mjs";
import blink from "./specs/blink.mjs";
import haste from "./specs/haste.mjs";
import hungerOfHadar from "./specs/hunger-of-hadar.mjs";
import sleetStorm from "./specs/sleet-storm.mjs";
import stinkingCloud from "./specs/stinking-cloud.mjs";
import blight from "./specs/blight.mjs";
import banishment from "./specs/banishment.mjs";
import confusion from "./specs/confusion.mjs";
import blackTentacles from "./specs/black-tentacles.mjs";
import iceStorm from "./specs/ice-storm.mjs";
import guardianOfFaith from "./specs/guardian-of-faith.mjs";
import graspingVine from "./specs/grasping-vine.mjs";
import wallOfFire from "./specs/wall-of-fire.mjs";
import spiritualWeapon from "./specs/spiritual-weapon.mjs";
import flamingSphere from "./specs/flaming-sphere.mjs";
import conjureMinorElementals from "./specs/conjure-minor-elementals.mjs";
import conjureWoodlandBeings from "./specs/conjure-woodland-beings.mjs";
import conjureElemental from "./specs/conjure-elemental.mjs";
import danseMacabre from "./specs/danse-macabre.mjs";
import dominateBeast from "./specs/dominate-beast.mjs";
import deathWard from "./specs/death-ward.mjs";
import freedomOfMovement from "./specs/freedom-of-movement.mjs";
import greaterInvisibility from "./specs/greater-invisibility.mjs";
import phantasmalKiller from "./specs/phantasmal-killer.mjs";
import staggeringSmite from "./specs/staggering-smite.mjs";
import stoneskin from "./specs/stoneskin.mjs";
import coneOfCold from "./specs/cone-of-cold.mjs";
import destructiveWave from "./specs/destructive-wave.mjs";
import dispelEvilAndGood from "./specs/dispel-evil-and-good.mjs";
import dominatePerson from "./specs/dominate-person.mjs";
import flameStrike from "./specs/flame-strike.mjs";
import greaterRestoration from "./specs/greater-restoration.mjs";
import holdMonster from "./specs/hold-monster.mjs";
import massCureWounds from "./specs/mass-cure-wounds.mjs";
import planarBinding from "./specs/planar-binding.mjs";
import seeming from "./specs/seeming.mjs";
import cloudkill from "./specs/cloudkill.mjs";
import insectPlague from "./specs/insect-plague.mjs";
import banishingSmite from "./specs/banishing-smite.mjs";
import contagion from "./specs/contagion.mjs";
import telekinesis from "./specs/telekinesis.mjs";
import wallOfStone from "./specs/wall-of-stone.mjs";
import arcaneGate from "./specs/arcane-gate.mjs";
import bladeBarrier from "./specs/blade-barrier.mjs";
import chainLightning from "./specs/chain-lightning.mjs";
import circleOfDeath from "./specs/circle-of-death.mjs";
import createUndead from "./specs/create-undead.mjs";
import disintegrate from "./specs/disintegrate.mjs";
import eyebite from "./specs/eyebite.mjs";
import fleshToStone from "./specs/flesh-to-stone.mjs";
import freezingSphere from "./specs/freezing-sphere.mjs";
import globeOfInvulnerability from "./specs/globe-of-invulnerability.mjs";
import harm from "./specs/harm.mjs";
import heal from "./specs/heal.mjs";
import heroesFeast from "./specs/heroes-feast.mjs";
import irresistibleDance from "./specs/irresistible-dance.mjs";
import planarAlly from "./specs/planar-ally.mjs";
import sunbeam from "./specs/sunbeam.mjs";
import wallOfIce from "./specs/wall-of-ice.mjs";
import wallOfThorns from "./specs/wall-of-thorns.mjs";
import windWalk from "./specs/wind-walk.mjs";

const entries = [
  { definition: dancingLights, benchmark: true, compiled: true },
  { definition: hypnoticPattern, benchmark: true, compiled: true },
  { definition: auraOfVitality, benchmark: true, compiled: true },
  { definition: cureWounds, benchmark: true, compiled: true },
  { definition: bless, benchmark: true, compiled: true },
  { definition: holdPerson, benchmark: true, compiled: true },
  { definition: protectionFromEnergy, benchmark: true, compiled: true },
  { definition: brandingSmite, benchmark: true, compiled: true },
  { definition: armorOfAgathys, benchmark: true, compiled: true },
  { definition: fireShield, benchmark: true, compiled: true },
  { definition: wardingBond, benchmark: true, compiled: true },
  { definition: silence, benchmark: true, compiled: true },
  { definition: moonbeam, benchmark: true, compiled: true },
  { definition: mistyStep, benchmark: true, compiled: true },
  { definition: guidingBolt, benchmark: true, compiled: true },
  { definition: faerieFire, benchmark: true, compiled: true },
  { definition: light, benchmark: true, compiled: true },
  { definition: healingWord, benchmark: true, compiled: true },
  { definition: prayerOfHealing, benchmark: true, compiled: true },
  { definition: massHealingWord, benchmark: true, compiled: true },
  { definition: inflictWounds, benchmark: true, compiled: true },
  { definition: searingSmite, benchmark: true, compiled: true },
  { definition: thunderousSmite, benchmark: true, compiled: true },
  { definition: wrathfulSmite, benchmark: true, compiled: true },
  { definition: shieldOfFaith, benchmark: true, compiled: true },
  { definition: bane, benchmark: true, compiled: true },
  { definition: lesserRestoration, benchmark: true, compiled: true },
  { definition: protectionFromPoison, benchmark: true, compiled: true },
  { definition: slow, benchmark: true, compiled: true },
  { definition: blindnessDeafness, benchmark: true, compiled: true },
  { definition: heroism, benchmark: true, compiled: true },
  { definition: hideousLaughter, benchmark: true, compiled: true },
  { definition: darkness, benchmark: true, compiled: true },
  { definition: sleep, benchmark: true, compiled: true },
  { definition: protectionFromEvilAndGood, benchmark: true, compiled: true },
  { definition: magicWeapon, benchmark: true, compiled: true },
  { definition: inciteGreed, benchmark: true, compiled: true },
  { definition: lifeTransference, benchmark: true, compiled: true },
  { definition: motivationalSpeech, benchmark: true, compiled: true },
  { definition: spiritGuardians, benchmark: true, compiled: true },
  { definition: spiritShroud, benchmark: true, compiled: true },
  { definition: command, benchmark: true, compiled: true },
  { definition: dissonantWhispers, benchmark: true, compiled: true },
  { definition: divineFavor, benchmark: true, compiled: true },
  { definition: huntersMark, benchmark: true, compiled: true },
  { definition: mirrorImage, benchmark: true, compiled: true },
  { definition: passWithoutTrace, benchmark: true, compiled: true },
  { definition: sanctuary, benchmark: true, compiled: true },
  { definition: zephyrStrike, benchmark: true, compiled: true },
  { definition: beaconOfHope, benchmark: true, compiled: true },
  { definition: bestowCurse, benchmark: true, compiled: true },
  { definition: enemiesAbound, benchmark: true, compiled: true },
  { definition: gaseousForm, benchmark: true, compiled: true },
  { definition: falseLife, benchmark: true, compiled: true },
  { definition: longstrider, benchmark: true, compiled: true },
  { definition: acidArrow, benchmark: true, compiled: true },
  { definition: darkvision, benchmark: true, compiled: true },
  { definition: shatter, benchmark: true, compiled: true },
  { definition: intellectFortress, benchmark: true, compiled: true },
  { definition: fly, benchmark: true, compiled: true },
  { definition: daylight, benchmark: true, compiled: true },
  { definition: magicCircle, benchmark: true, compiled: true },
  { definition: crusadersMantle, benchmark: true, compiled: true },
  { definition: guidance, benchmark: true, compiled: true },
  { definition: rayOfFrost, benchmark: true, compiled: true },
  { definition: sacredFlame, benchmark: true, compiled: true },
  { definition: viciousMockery, benchmark: true, compiled: true },
  { definition: mindSpike, benchmark: true, compiled: true },
  { definition: boomingBladeTce, benchmark: true, compiled: true },
  { definition: aid, benchmark: true, compiled: true },
  { definition: calmEmotions, benchmark: true, compiled: true },
  { definition: acidSplash, benchmark: true, compiled: true },
  { definition: fireBolt, benchmark: true, compiled: true },
  { definition: poisonSpray, benchmark: true, compiled: true },
  { definition: armsOfHadar, benchmark: true, compiled: true },
  { definition: burningHands, benchmark: true, compiled: true },
  { definition: thunderwave, benchmark: true, compiled: true },
  { definition: conjureBarrage, benchmark: true, compiled: true },
  { definition: fireball, benchmark: true, compiled: true },
  { definition: lightningBolt, benchmark: true, compiled: true },
  { definition: chillTouch, benchmark: true, compiled: true },
  { definition: eldritchBlast, benchmark: true, compiled: true },
  { definition: produceFlame, benchmark: true, compiled: true },
  { definition: shockingGrasp, benchmark: true, compiled: true },
  { definition: thornWhip, benchmark: true, compiled: true },
  { definition: tollTheDead, benchmark: true, compiled: true },
  { definition: chromaticOrb, benchmark: true, compiled: true },
  { definition: iceKnife, benchmark: true, compiled: true },
  { definition: magicMissile, benchmark: true, compiled: true },
  { definition: scorchingRay, benchmark: true, compiled: true },
  { definition: bladeWard, benchmark: true, compiled: true },
  { definition: resistance, benchmark: true, compiled: true },
  { definition: trueStrike, benchmark: true, compiled: true },
  { definition: jump, benchmark: true, compiled: true },
  { definition: expeditiousRetreat, benchmark: true, compiled: true },
  { definition: blur, benchmark: true, compiled: true },
  { definition: invisibility, benchmark: true, compiled: true },
  { definition: enlargereduce, benchmark: true, compiled: true },
  { definition: shillelagh, benchmark: true, compiled: true },
  { definition: ensnaringStrike, benchmark: true, compiled: true },
  { definition: hailOfThorns, benchmark: true, compiled: true },
  { definition: hex, benchmark: true, compiled: true },
  { definition: blindingSmite, benchmark: true, compiled: true },
  { definition: elementalWeapon, benchmark: true, compiled: true },
  { definition: lightningArrows, benchmark: true, compiled: true },
  { definition: animalFriendship, benchmark: true, compiled: true },
  { definition: charmPerson, benchmark: true, compiled: true },
  { definition: colorSpray, benchmark: true, compiled: true },
  { definition: rayOfSickness, benchmark: true, compiled: true },
  { definition: crownOfMadness, benchmark: true, compiled: true },
  { definition: enthrall, benchmark: true, compiled: true },
  { definition: phantasmalForce, benchmark: true, compiled: true },
  { definition: rayOfEnfeeblement, benchmark: true, compiled: true },
  { definition: fear, benchmark: true, compiled: true },
  { definition: entangle, benchmark: true, compiled: true },
  { definition: fogCloud, benchmark: true, compiled: true },
  { definition: cloudOfDaggers, benchmark: true, compiled: true },
  { definition: gustOfWind, benchmark: true, compiled: true },
  { definition: spikeGrowth, benchmark: true, compiled: true },
  { definition: web, benchmark: true, compiled: true },
  { definition: grease, benchmark: true, compiled: true },
  { definition: plantGrowth, benchmark: true, compiled: true },
  { definition: witchBolt, benchmark: true, compiled: true },
  { definition: heatMetal, benchmark: true, compiled: true },
  { definition: callLightning, benchmark: true, compiled: true },
  { definition: vampiricTouch, benchmark: true, compiled: true },
  { definition: blink, benchmark: true, compiled: true },
  { definition: haste, benchmark: true, compiled: true },
  { definition: hungerOfHadar, benchmark: true, compiled: true },
  { definition: sleetStorm, benchmark: true, compiled: true },
  { definition: stinkingCloud, benchmark: true, compiled: true },
  { definition: blight, benchmark: true, compiled: true },
  { definition: banishment, benchmark: true, compiled: true },
  { definition: confusion, benchmark: true, compiled: true },
  { definition: blackTentacles, benchmark: true, compiled: true },
  { definition: iceStorm, benchmark: true, compiled: true },
  { definition: guardianOfFaith, benchmark: true, compiled: true },
  { definition: graspingVine, benchmark: true, compiled: true },
  { definition: wallOfFire, benchmark: true, compiled: true },
  { definition: spiritualWeapon, benchmark: true, compiled: true },
  { definition: flamingSphere, benchmark: true, compiled: true },
  { definition: conjureMinorElementals, benchmark: true, compiled: true },
  { definition: conjureWoodlandBeings, benchmark: true, compiled: true },
  { definition: conjureElemental, benchmark: true, compiled: true },
  { definition: danseMacabre, benchmark: true, compiled: true },
  { definition: dominateBeast, benchmark: true, compiled: true },
  { definition: deathWard, benchmark: true, compiled: true },
  { definition: freedomOfMovement, benchmark: true, compiled: true },
  { definition: greaterInvisibility, benchmark: true, compiled: true },
  { definition: phantasmalKiller, benchmark: true, compiled: true },
  { definition: staggeringSmite, benchmark: true, compiled: true },
  { definition: stoneskin, benchmark: true, compiled: true },
  { definition: coneOfCold, benchmark: true, compiled: true },
  { definition: destructiveWave, benchmark: true, compiled: true },
  { definition: dispelEvilAndGood, benchmark: true, compiled: true },
  { definition: dominatePerson, benchmark: true, compiled: true },
  { definition: flameStrike, benchmark: true, compiled: true },
  { definition: greaterRestoration, benchmark: true, compiled: true },
  { definition: holdMonster, benchmark: true, compiled: true },
  { definition: massCureWounds, benchmark: true, compiled: true },
  { definition: planarBinding, benchmark: true, compiled: true },
  { definition: seeming, benchmark: true, compiled: true },
  { definition: cloudkill, benchmark: true, compiled: true },
  { definition: insectPlague, benchmark: true, compiled: true },
  { definition: banishingSmite, benchmark: true, compiled: true },
  { definition: contagion, benchmark: true, compiled: true },
  { definition: telekinesis, benchmark: true, compiled: true },
  { definition: wallOfStone, benchmark: true, compiled: true },
  { definition: arcaneGate, benchmark: true, compiled: true },
  { definition: bladeBarrier, benchmark: true, compiled: true },
  { definition: chainLightning, benchmark: true, compiled: true },
  { definition: circleOfDeath, benchmark: true, compiled: true },
  { definition: createUndead, benchmark: true, compiled: true },
  { definition: disintegrate, benchmark: true, compiled: true },
  { definition: eyebite, benchmark: true, compiled: true },
  { definition: fleshToStone, benchmark: true, compiled: true },
  { definition: freezingSphere, benchmark: true, compiled: true },
  { definition: globeOfInvulnerability, benchmark: true, compiled: true },
  { definition: harm, benchmark: true, compiled: true },
  { definition: heal, benchmark: true, compiled: true },
  { definition: heroesFeast, benchmark: true, compiled: true },
  { definition: irresistibleDance, benchmark: true, compiled: true },
  { definition: planarAlly, benchmark: true, compiled: true },
  { definition: sunbeam, benchmark: true, compiled: true },
  { definition: wallOfIce, benchmark: true, compiled: true },
  { definition: wallOfThorns, benchmark: true, compiled: true },
  { definition: windWalk, benchmark: true, compiled: true },
];

const ids = entries.map(({ definition }) => definition.id);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length > 0) {
  throw new Error(`Duplicate spell automation definition ids: ${[...new Set(duplicateIds)].join(", ")}`);
}
const compiledOutsideBenchmark = entries
  .filter(entry => entry.compiled && !entry.benchmark)
  .map(entry => entry.definition.id);
if (compiledOutsideBenchmark.length > 0) {
  throw new Error(`Compiled spell specs must also be benchmarked: ${compiledOutsideBenchmark.join(", ")}`);
}
const registeredFiles = ids.map(id => `${id}.mjs`).sort();
const specFiles = readdirSync(new URL("./specs/", import.meta.url))
  .filter(file => file.endsWith(".mjs"))
  .sort();
if (JSON.stringify(registeredFiles) !== JSON.stringify(specFiles)) {
  throw new Error(
    `Spell automation registry/files mismatch: registered=${registeredFiles.join(", ")} files=${specFiles.join(", ")}`,
  );
}

export const spellAutomationBenchmarkIds = Object.freeze(
  entries.filter(entry => entry.benchmark).map(entry => entry.definition.id),
);

export const spellAutomationCompiledIds = Object.freeze(
  entries.filter(entry => entry.compiled).map(entry => entry.definition.id),
);

export const spellAutomationSpecs = Object.freeze(Object.fromEntries(
  entries.map(({ definition }) => [definition.id, definition]),
));
