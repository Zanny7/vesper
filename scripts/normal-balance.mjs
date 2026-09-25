// BAT-78 reproducible normal-route encounter simulation.
// Run with `node scripts/normal-balance.mjs [samples]`.
import { CHAPTERS, CHAPTER_ENCOUNTERS } from '../src/data.js';
import { rollNormalLoot, NORMAL_LOOT_TABLES } from '../src/loot.js';
import { allocations, acquireRoute, fight, recursiveInheritedEquipment, routes, seeded, regeared } from './boss-balance.mjs';
import { pathToFileURL } from 'node:url';

const samples = Number(process.argv[2] || 100);
const chapters = (process.env.CHAPTERS || '1,2,3,4').split(',').map(Number);
const healers = (process.env.HEALERS || 'priest,druid').split(',');
const profiles = (process.env.PROFILES || 'veryGood,average,weak').split(',');
const clearCounts = (process.env.CLEAR_COUNTS || '0,2,3,4,5').split(',').map(Number);

function trial(chapterIndex, healer, profile, clearCount, seed, variant) {
  const random = seeded(seed);
  const inherited = recursiveInheritedEquipment(chapterIndex, healer, profile, seed, random);
  let equipment = inherited.equipment;
  const chapter = CHAPTERS[chapterIndex];
  const validRoutes = routes(chapter);
  for (let clear = 0; clear < clearCount; clear++) {
    acquireRoute(chapter, validRoutes[Math.floor(random() * validRoutes.length)], equipment, healer, random);
    equipment = regeared(equipment, healer);
  }
  const currentGear = equipment.collection().filter(item => item.chapter === chapterIndex + 1).length;
  const route = validRoutes[Math.floor(random() * validRoutes.length)];
  let resources = null;
  const stages = [];
  for (const [index, node] of route.entries()) {
    const game = fight(CHAPTER_ENCOUNTERS[node.encounter], equipment, healer, random, resources,
      allocations(healer, chapterIndex, clearCount > 0 || index > 0, variant), profile);
    stages.push({ encounter: node.encounter, status: game.status, seconds: game.time,
      hp: Object.fromEntries(game.party.map(member => [member.id, Math.round(member.hp)])),
      mana: Math.round(game.mana), effectiveHealing: Math.round(game.stats.effective),
      overhealing: Math.round(game.stats.overheal), deaths: game.stats.deaths });
    if (game.status !== 'victory') break;
    resources = game.resources();
    for (const item of rollNormalLoot(NORMAL_LOOT_TABLES[node.encounter], equipment.ownedIds, healer, random)) equipment.acquire(item.id);
    equipment = regeared(equipment, healer);
  }
  return { currentGear, route: route.map(node => node.encounter), stages };
}

const mean = (rows, pick) => rows.reduce((total, row) => total + pick(row), 0) / rows.length;
function summarize(rows) {
  const encounterIds = [...new Set(rows.flatMap(row => row.route))];
  return encounterIds.map(encounter => {
    const atRisk = rows.filter(row => row.route.includes(encounter));
    const reached = atRisk.map(row => row.stages.find(stage => stage.encounter === encounter)).filter(Boolean);
    const won = reached.filter(stage => stage.status === 'victory');
    const failed = reached.filter(stage => stage.status !== 'victory');
    return { encounter, reached: reached.length / rows.length, winWhenReached: won.length / Math.max(1, reached.length),
      failuresAt: failed.length / rows.length,
      meanFightSeconds: mean(reached, stage => stage.seconds),
      meanEndingMana: mean(won, stage => stage.mana),
      meanEndingPartyHp: mean(won, stage => Object.values(stage.hp).reduce((sum, hp) => sum + hp, 0)),
      deaths: mean(reached, stage => stage.deaths) };
  });
}

function summarizeRoutes(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = row.route.join(' → ');
    const group = groups.get(key) || { route: row.route, attempts: 0, wins: 0 };
    group.attempts++;
    if (row.stages.length === row.route.length && row.stages.every(stage => stage.status === 'victory')) group.wins++;
    groups.set(key, group);
  }
  return [...groups.values()].map(group => ({ route: group.route, attempts: group.attempts,
    completion: group.wins / group.attempts }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const chapter of chapters) for (const healer of healers) for (const profile of profiles) for (const clears of clearCounts) {
    const variants = chapter === 4
      ? healer === 'priest' ? ['twin-penance', 'sanctuary'] : ['twin-rejuvenation', 'tranquility']
      : ['core'];
    for (const variant of variants) {
      const variantOffset = variant === 'tranquility' || variant === 'sanctuary' ? 50000 : 0;
      const rows = Array.from({ length: samples }, (_, index) => trial(chapter - 1, healer, profile, clears,
        78000 + (chapter - 1) * 100000 + (healer === 'druid' ? 10000 : 0) + (profile === 'average' ? 20000 : profile === 'weak' ? 40000 : 0) + clears * 1000 + variantOffset + index, variant));
      console.log(JSON.stringify({ chapter, healer, profile, variant, clears, samples,
        meanCurrentChapterItems: mean(rows, row => row.currentGear),
        routeCompletion: rows.filter(row => row.stages.length === row.route.length && row.stages.every(stage => stage.status === 'victory')).length / rows.length,
        routeOutcomes: summarizeRoutes(rows),
        encounters: summarize(rows) }));
    }
  }
}
