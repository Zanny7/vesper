// BAT-82 post-rebalance route and boss check with the redesigned healer policy.
// node scripts/talent-route-balance.mjs [samples] > docs/bat-82-routes.jsonl
import { CHAPTERS, CHAPTER_ENCOUNTERS } from '../src/data.js';
import { NORMAL_LOOT_TABLES, rollNormalLoot } from '../src/loot.js';
import { regeared, routes, seeded } from './boss-balance.mjs';
import { builds, equipmentFor, fight } from './talent-balance.mjs';

const samples = Number(process.argv[2] || 100);
const chapters = (process.env.CHAPTERS || '1,2,3,4').split(',').map(Number);
const buildFilter = process.env.BUILD_FILTER?.split(',');
const selectedBuilds = {
  priest: ['1-binding', '3-binding', '5-penance', '7-fourfold', '7-echo'],
  druid: ['1-rejuvenation', '3-rejuvenation', '5-nourishment', '7-blooming', '7-ward'],
};
for (const chapter of chapters) for (const healer of ['priest', 'druid']) {
  for (const name of selectedBuilds[healer].filter(build => Number(build[0]) === chapter * 2 - 1 && (!buildFilter || buildFilter.includes(build)))) {
    const outcomes = [];
    for (let i = 0; i < samples; i++) {
      const seed = 83000 + chapter * 10000 + i;
      const random = seeded(seed);
      let equipment = equipmentFor(chapter, healer, seed);
      const chapterData = CHAPTERS[chapter - 1];
      const path = routes(chapterData)[Math.floor(random() * routes(chapterData).length)];
      const boss = chapterData.nodes.find(node => node.kind === 'boss');
      let resources = null, routeWon = true, bossWon = false, bossEntryMana = null;
      let routeHealing = 0, bossHealing = 0, routeDamage = 0, bossDamage = 0;
      for (const node of [...path, boss]) {
        if (node === boss) bossEntryMana = resources?.mana.current ?? null;
        const result = fight(CHAPTER_ENCOUNTERS[node.encounter], equipment, healer, builds[healer][name],
          Math.floor(random() * 2 ** 32), resources);
        if (node === boss) { bossWon = result.won; bossHealing = result.effective; bossDamage = result.partyDamage; }
        else { routeHealing += result.effective; routeDamage += result.partyDamage; }
        if (!result.won) { if (node !== boss) routeWon = false; break; }
        resources = result.resources;
        if (node !== boss) {
          for (const item of rollNormalLoot(NORMAL_LOOT_TABLES[node.encounter], equipment.ownedIds, healer, random)) equipment.acquire(item.id);
          equipment = regeared(equipment, healer);
        }
      }
      outcomes.push({ routeWon, bossWon, bossEntryMana, routeHealing, bossHealing, routeDamage, bossDamage });
    }
    const mean = (rows, key) => rows.reduce((sum, row) => sum + row[key], 0) / Math.max(1, rows.length);
    const reached = outcomes.filter(row => row.routeWon);
    console.log(JSON.stringify({ chapter, healer, build: name, samples,
      routeCompletion: reached.length / samples, fullCompletion: outcomes.filter(row => row.bossWon).length / samples,
      bossWinWhenReached: reached.filter(row => row.bossWon).length / Math.max(1, reached.length),
      bossEntryMana: mean(reached, 'bossEntryMana'), routeHealing: mean(outcomes, 'routeHealing'),
      routeDamage: mean(outcomes, 'routeDamage'), bossHealing: mean(reached, 'bossHealing'), bossDamage: mean(reached, 'bossDamage') }));
  }
}
