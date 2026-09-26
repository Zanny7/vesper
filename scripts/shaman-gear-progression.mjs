// BAT-88: loot-only progression; assumes route/boss victories, never tunes combat.
// node scripts/shaman-gear-progression.mjs [samples=256]
import { pathToFileURL } from 'node:url';
import { CHAPTERS, SLOTS, HEALERS } from '../src/data.js';
import { averageItemLevel } from '../src/item-model.js';
import { acquireRoute, recursiveInheritedEquipment, regeared, routes, seeded } from './boss-balance.mjs';

const statKeys = ['maxHp', 'maxMana', 'manaRegen', 'spellPower', 'haste', 'crit', 'armor', 'resistance'];
const round = value => Math.round(value * 1000) / 1000;
export function gearSnapshot(equipment, healerId, chapter) {
  const party = equipment.party(healerId), healer = equipment.healer(healerId);
  const currentSlots = SLOTS.healer.filter(slot => equipment.item({ id: healerId }, slot)?.chapter === chapter);
  return { currentSlots, currentCount: currentSlots.length,
    partyCurrentCount: party.reduce((sum, member) => sum + equipment.slots(member)
      .filter(slot => equipment.item(member, slot)?.chapter === chapter).length, 0),
    avgPartyIlvl: round(party.reduce((sum, member) => sum + averageItemLevel(member, equipment.equipped), 0) / party.length),
    stats: Object.fromEntries(statKeys.map(stat => [stat, round(healer[stat] || 0)])),
    loadout: structuredClone(equipment.equipped) };
}

export function sampleGearProgression(samples = 256) {
  if (!Number.isInteger(samples) || samples < 1) throw new Error('samples must be a positive integer');
  const rows = [];
  for (let chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex++) {
    const chapter = CHAPTERS[chapterIndex], paths = routes(chapter);
    for (const healerId of Object.keys(HEALERS)) {
      const buckets = Object.fromEntries([0, 1, 2, 3, 4, 5].map(clear => [clear, []]));
      for (let index = 0; index < samples; index++) {
        // Same seed schedule for every healer. Eligibility can change RNG use.
        const seed = 88000 + chapterIndex * 10000 + index, random = seeded(seed);
        let { equipment, history } = recursiveInheritedEquipment(chapterIndex, healerId, 'average', seed, random);
        for (let clear = 0; clear <= 5; clear++) {
          if (clear) acquireRoute(chapter, paths[Math.floor(random() * paths.length)], equipment, healerId, random);
          equipment = regeared(equipment, healerId);
          buckets[clear].push({ seed, history, ...gearSnapshot(equipment, healerId, chapterIndex + 1) });
        }
      }
      for (const [clears, states] of Object.entries(buckets)) {
        const mean = getter => round(states.reduce((sum, state) => sum + getter(state), 0) / samples);
        const ordered = [...states].sort((a, b) => a.currentCount - b.currentCount || a.avgPartyIlvl - b.avgPartyIlvl);
        rows.push({ chapter: chapterIndex + 1, healer: healerId, clears: Number(clears), samples,
          meanCurrentSlots: mean(state => state.currentCount),
          meanPartyCurrentSlots: mean(state => state.partyCurrentCount),
          meanPartyIlvl: mean(state => state.avgPartyIlvl),
          slotOccupancy: Object.fromEntries(SLOTS.healer.map(slot => [slot, mean(state => Number(state.currentSlots.includes(slot)))])),
          meanStats: Object.fromEntries(statKeys.map(stat => [stat, mean(state => state.stats[stat])])),
          representative: ordered[Math.floor(samples / 2)] });
      }
    }
  }
  return { model: 'Live normal/hidden boss loot, shared compatibility, no duplicates, shared weighted equipment sampler. Previous chapters use average-profile recursive inheritance (3 farming routes, boss approach, normal and bonus boss rewards, then 0–1 extra routes). Current chapter snapshots are before its boss. Victories assumed; no talents or combat simulation.', rows };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(sampleGearProgression(Number(process.argv[2] || 256)), null, 2));
