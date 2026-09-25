// Audit authored healer gear against actual pre-boss route loot and eligibility.
import { CHAPTERS, GEAR, SLOTS } from '../src/data.js';
import { NORMAL_LOOT_TABLES, eligibleLootPool, BOSS_BONUS_LOOT_TABLES } from '../src/loot.js';
import { canEquipItem } from '../src/item-model.js';
import { routes } from './boss-balance.mjs';

const statKeys = ['maxHp', 'maxMana', 'manaRegen', 'spellPower', 'haste', 'crit', 'armor', 'resistance'];
const itemSummary = item => ({ id: item.id, ilvl: item.itemLevel,
  // Match the healer equipment sampler's stat weights; this is a comparison
  // score, not an extra combat stat or an automatic item-level multiplier.
  budgetScore: Math.round(((item.stats.maxHp || 0) / 30 + (item.stats.maxMana || 0) / 35
    + (item.stats.manaRegen || 0) * 8 + (item.stats.spellPower || 0) / 5
    + (item.stats.haste || 0) / 2 + (item.stats.crit || 0) / 2
    + (item.stats.armor || 0) / 3 + (item.stats.resistance || 0) / 3) * 100) / 100,
  stats: Object.fromEntries(statKeys.map(key => [key, item.stats[key] || 0])) });

export function auditGearParity() {
  return CHAPTERS.map((chapter, index) => {
    const routeIds = routes(chapter).map(route => route.map(node => node.encounter));
    const preBossIds = [...new Set(routeIds.flat())];
    const bossId = chapter.nodes.find(node => node.kind === 'boss').encounter;
    const healer = Object.fromEntries(['priest', 'druid'].map(owner => [owner,
      Object.fromEntries(SLOTS.healer.map(slot => {
        const authored = GEAR.filter(item => item.chapter === index + 1 && item.owner === owner && item.slot === slot);
        const eligible = preBossIds.flatMap(encounter => eligibleLootPool(NORMAL_LOOT_TABLES[encounter], [], owner))
          .filter(item => authored.some(candidate => candidate.id === item.id));
        const routesWithUpgrade = routeIds.filter(route => route.some(encounter =>
          eligibleLootPool(NORMAL_LOOT_TABLES[encounter], [], owner)
            .some(item => authored.some(candidate => candidate.id === item.id)))).length;
        const bonusOnly = authored.filter(item => BOSS_BONUS_LOOT_TABLES[bossId].includes(item.id)
          && !eligible.some(candidate => candidate.id === item.id));
        return [slot, { authored: authored.map(itemSummary),
          preBoss: [...new Set(eligible.map(item => item.id))],
          routeCoverage: `${routesWithUpgrade}/${routeIds.length}`,
          bonusOnly: bonusOnly.map(item => item.id) }];
      }))]));
    const companionDifferences = [];
    for (const encounter of [...preBossIds, bossId]) {
      const byHealer = ['priest', 'druid'].map(owner => eligibleLootPool(NORMAL_LOOT_TABLES[encounter], [], owner)
        .filter(item => ['tank', 'rogue', 'mage', 'ranger'].includes(item.owner))
        .map(item => item.id).sort());
      if (JSON.stringify(byHealer[0]) !== JSON.stringify(byHealer[1]))
        companionDifferences.push({ encounter, priest: byHealer[0], druid: byHealer[1] });
    }
    return { chapter: index + 1, routes: routeIds, healer, companionDifferences };
  });
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/')))
  console.log(JSON.stringify(auditGearParity(), null, 2));
