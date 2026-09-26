// Audit authored healer gear against actual pre-boss route loot and eligibility.
import { CHAPTERS, GEAR, SLOTS, HEALERS } from '../src/data.js';
import { NORMAL_LOOT_TABLES, eligibleLootPool, BOSS_BONUS_LOOT_TABLES } from '../src/loot.js';
import { canEquipItem } from '../src/item-model.js';
import { routes } from './boss-balance.mjs';

const statKeys = ['maxHp', 'maxMana', 'manaRegen', 'spellPower', 'haste', 'crit', 'armor', 'resistance'];
export const itemSummary = item => ({ id: item.id, ilvl: item.itemLevel,
  // Match the healer equipment sampler's stat weights; this is a comparison
  // score, not an extra combat stat or an automatic item-level multiplier.
  budgetScore: Math.round(((item.stats.maxHp || 0) / 30 + (item.stats.maxMana || 0) / 35
    + (item.stats.manaRegen || 0) * 8 + (item.stats.spellPower || 0) / 5
    + (item.stats.haste || 0) / 2 + (item.stats.crit || 0) / 2
    + (item.stats.armor || 0) / 3 + (item.stats.resistance || 0) / 3) * 100) / 100,
  stats: Object.fromEntries(statKeys.map(key => [key, item.stats[key] || 0])) });

export function auditGearParity() {
  const healerIds = Object.keys(HEALERS);
  return CHAPTERS.map((chapter, index) => {
    const routeIds = routes(chapter).map(route => route.map(node => node.encounter));
    const preBossIds = [...new Set(routeIds.flat())];
    const bossId = chapter.nodes.find(node => node.kind === 'boss').encounter;
    const healer = Object.fromEntries(healerIds.map(owner => [owner,
      Object.fromEntries(SLOTS.healer.map(slot => {
        const authored = GEAR.filter(item => item.chapter === index + 1 && item.owner === owner && item.slot === slot);
        const eligible = preBossIds.flatMap(encounter => eligibleLootPool(NORMAL_LOOT_TABLES[encounter], [], owner))
          .filter(item => authored.some(candidate => candidate.id === item.id));
        const routesWithUpgrade = routeIds.filter(route => route.some(encounter =>
          eligibleLootPool(NORMAL_LOOT_TABLES[encounter], [], owner)
            .some(item => authored.some(candidate => candidate.id === item.id)))).length;
        const bonusOnly = authored.filter(item => BOSS_BONUS_LOOT_TABLES[bossId].includes(item.id)
          && !eligible.some(candidate => candidate.id === item.id));
        const compatible = GEAR.filter(item => item.chapter === index + 1 && canEquipItem(owner, slot, item));
        const availableFrom = item => preBossIds.filter(encounter => NORMAL_LOOT_TABLES[encounter].includes(item.id));
        return [slot, { authored: authored.map(itemSummary),
          // Universal armor/trinkets also contribute to practical access.
          eligible: compatible.map(item => ({ ...itemSummary(item), owner: item.owner,
            encounters: availableFrom(item), normalBoss: NORMAL_LOOT_TABLES[bossId].includes(item.id),
            hiddenBoss: BOSS_BONUS_LOOT_TABLES[bossId].includes(item.id) })),
          preBoss: [...new Set(eligible.map(item => item.id))],
          encounters: Object.fromEntries(authored.map(item => [item.id, availableFrom(item)])),
          normalBoss: authored.filter(item => NORMAL_LOOT_TABLES[bossId].includes(item.id)).map(item => item.id),
          hiddenBoss: authored.filter(item => BOSS_BONUS_LOOT_TABLES[bossId].includes(item.id)).map(item => item.id),
          routeCoverage: `${routesWithUpgrade}/${routeIds.length}`,
          bonusOnly: bonusOnly.map(item => item.id) }];
      }))]));
    const companionDifferences = [];
    for (const encounter of [...preBossIds, bossId]) for (const [kind, tables] of [['normal', NORMAL_LOOT_TABLES], ['bonus', BOSS_BONUS_LOOT_TABLES]]) {
      const byHealer = healerIds.map(owner => eligibleLootPool(tables[encounter], [], owner)
        .filter(item => ['tank', 'rogue', 'mage', 'ranger'].includes(item.owner))
        .map(item => item.id).sort());
      if (byHealer.some(items => JSON.stringify(items) !== JSON.stringify(byHealer[0])))
        companionDifferences.push({ encounter, kind, ...Object.fromEntries(healerIds.map((id, i) => [id, byHealer[i]])) });
    }
    return { chapter: index + 1, routes: routeIds, healer, companionDifferences };
  });
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/')))
  console.log(JSON.stringify(auditGearParity(), null, 2));
