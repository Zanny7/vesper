// BAT-77: seeded, equipment-slot readiness samples using the BAT-68 loot/equip model.
// Run: node scripts/chapter-benchmarks.mjs [samples]
import { CHAPTERS, GEAR, SLOTS } from '../src/data.js';
import { averageItemLevel, slotsForOwner } from '../src/item-model.js';
import { NORMAL_LOOT_TABLES, eligibleLootPool } from '../src/loot.js';
import { acquireRoute, allocations, readinessClears, recursiveInheritedEquipment, regeared, routes, seeded, SKILL_PROFILES } from './boss-balance.mjs';

const samples = Number(process.argv[2] || 300);
if (!Number.isInteger(samples) || samples < 1) throw new Error('samples must be a positive integer');
const healerIds = ['priest', 'druid'];
const members = healerId => ['tank', 'rogue', 'mage', 'ranger', healerId];
const slotCount = members('priest').reduce((sum, id) => sum + slotsForOwner(id).length, 0);
const tiers = ['veryGood', 'average', 'weak'];
const rounded = value => Math.round(value * 100) / 100;
const mean = (rows, key) => rounded(rows.reduce((sum, row) => sum + row[key], 0) / rows.length);
const median = values => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)]; };
const itemAt = (equipment, owner, slot) => GEAR.find(item => item.id === equipment.equipped[owner]?.[slot]);

function sample(chapterIndex, healerId, tier, seed) {
  const random = seeded(seed);
  let { equipment, history } = recursiveInheritedEquipment(chapterIndex, healerId, tier, seed, random);
  const inherited = snapshot(equipment, healerId, chapterIndex + 1);
  const inheritedLoadout = equipment.equipped;
  const chapter = CHAPTERS[chapterIndex], paths = routes(chapter);
  const clears = readinessClears(tier, seed, chapterIndex);
  for (let clear = 0; clear < clears; clear++) acquireRoute(chapter, paths[Math.floor(random() * paths.length)], equipment, healerId, random);
  equipment = regeared(equipment, healerId);
  return { clears, inherited, inheritedLoadout, history, ...snapshot(equipment, healerId, chapterIndex + 1), loadout: equipment.equipped };
}

function snapshot(equipment, healerId, chapter) {
  const ids = members(healerId);
  const items = ids.flatMap(id => slotsForOwner(id).map(slot => itemAt(equipment, id, slot)).filter(Boolean));
  const party = equipment.party(healerId);
  const healer = party.find(member => member.id === healerId);
  return {
    currentCount: items.filter(item => item.chapter === chapter).length,
    equippedCount: items.length,
    ownedCurrent: equipment.collection().filter(item => item.chapter === chapter).length,
    avgIlvl: rounded(ids.reduce((sum, id) => sum + averageItemLevel({ id }, equipment.equipped) * slotsForOwner(id).length, 0) / slotCount),
    partyMaxHp: party.reduce((sum, member) => sum + member.maxHp, 0),
    partyArmor: party.reduce((sum, member) => sum + (member.armor || 0), 0),
    partyResistance: party.reduce((sum, member) => sum + (member.resistance || 0), 0),
    companionDamage: party.filter(member => member.id !== healerId).reduce((sum, member) => sum + (member.damage || 0), 0),
    healerMaxMana: healer.maxMana,
    healerManaRegen: healer.manaRegen,
    healerSpellPower: healer.spellPower || 0,
  };
}

const chapters = CHAPTERS.map((chapter, chapterIndex) => {
  const paths = routes(chapter);
  const routeLengths = [...new Set(paths.map(path => path.length))];
  const byTier = Object.fromEntries(tiers.map((tier, tierIndex) => {
    const byHealer = Object.fromEntries(healerIds.map((healerId, healerIndex) => {
      const rows = Array.from({ length: samples }, (_, index) => {
        return sample(chapterIndex, healerId, tier, 77000 + chapterIndex * 100000 + healerIndex * 10000 + tierIndex * 1000 + index);
      });
      const currentMedian = median(rows.map(row => row.currentCount));
      const representative = [...rows].sort((a, b) => Math.abs(a.currentCount - currentMedian) - Math.abs(b.currentCount - currentMedian)
        || Math.abs(a.avgIlvl - mean(rows, 'avgIlvl')) - Math.abs(b.avgIlvl - mean(rows, 'avgIlvl')))[0];
      return [healerId, {
        medianCurrentCount: currentMedian,
        meanCurrentCount: mean(rows, 'currentCount'),
        meanOwnedCurrent: mean(rows, 'ownedCurrent'),
        meanEquippedCount: mean(rows, 'equippedCount'),
        meanInheritedCount: mean(rows.map(row => row.inherited), 'equippedCount'),
        meanInheritedIlvl: mean(rows.map(row => row.inherited), 'avgIlvl'),
        priorChapterMeans: Array.from({ length: chapterIndex }, (_, previous) => ({
          chapter: previous + 1,
          readinessClears: mean(rows.map(row => ({ value: row.history[previous].readinessClears })), 'value'),
          extraClears: mean(rows.map(row => ({ value: row.history[previous].extraClears })), 'value'),
          equippedCountAfter: mean(rows.map(row => ({ value: row.history[previous].equippedCountAfter })), 'value'),
        })),
        stats: Object.fromEntries(['avgIlvl', 'partyMaxHp', 'partyArmor', 'partyResistance', 'companionDamage', 'healerMaxMana', 'healerManaRegen', 'healerSpellPower'].map(key => [key, mean(rows, key)])),
        representative: {
          currentCount: representative.currentCount,
          avgIlvl: representative.avgIlvl,
          stats: Object.fromEntries(['partyMaxHp', 'partyArmor', 'partyResistance', 'companionDamage', 'healerMaxMana', 'healerManaRegen', 'healerSpellPower'].map(key => [key, representative[key]])),
          priorChapterHistory: representative.history,
          inheritedLoadout: representative.inheritedLoadout,
          loadout: representative.loadout,
        },
      }];
    }));
    const count = Math.round((byHealer.priest.medianCurrentCount + byHealer.druid.medianCurrentCount) / 2);
    return [tier, { clears: tier === 'weak' ? 4.5 : tier === 'average' ? 3 : 2, equippedChapterItems: count, percentPartySlots: rounded(100 * count / slotCount), byHealer }];
  }));
  const normalPoolByHealer = Object.fromEntries(healerIds.map(healerId => [healerId, paths.map(path =>
    new Set(path.flatMap(node => eligibleLootPool(NORMAL_LOOT_TABLES[node.encounter], [], healerId).map(item => item.id))).size)]));
  const itemLevels = GEAR.filter(item => item.chapter === chapterIndex + 1).map(item => item.itemLevel);
  return { chapter: chapterIndex + 1, routeCount: paths.length, routeLengths, expectedDropsPerRoute: routeLengths.map(length => rounded(length * .65)),
    normalPoolByHealer, itemLevelBand: [Math.min(...itemLevels), Math.max(...itemLevels)], tiers: byTier };
});

console.log(JSON.stringify({ samplesPerHealerTier: samples, seedBase: 77000, slotCount, slots: SLOTS,
  inheritanceModel: 'recursive', priorBossApproachRoutes: 1, priorBossRewards: true,
  priorReadinessClears: { veryGood: [2], average: [3], weak: [4, 5] },
  priorExtraClears: { veryGood: [0], average: [0, 1], weak: [1, 2] },
  skillProfiles: SKILL_PROFILES, talentPresets: Object.fromEntries(CHAPTERS.map((_, index) => [index + 1, Object.fromEntries(healerIds.map(healerId => [healerId, index === 3 ? ['twin-penance', 'sanctuary', 'twin-rejuvenation', 'tranquility'].filter(variant => healerId === 'priest' ? variant === 'twin-penance' || variant === 'sanctuary' : variant === 'twin-rejuvenation' || variant === 'tranquility').map(variant => allocations(healerId, index, true, variant)) : allocations(healerId, index, true, 'core')]))])), chapters }, null, 2));
