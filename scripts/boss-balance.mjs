// Reproducible BAT-68 sampling of route loot and representative talented healers.
// Run with `node scripts/boss-balance.mjs [samples]`.
import { CHAPTERS, CHAPTER_ENCOUNTERS, GEAR, HEALERS } from '../src/data.js';
import { Combat } from '../src/combat.js';
import { Equipment } from '../src/gear.js';
import { priestTalentLoadout } from '../src/priest-talents.js';
import { druidTalentLoadout } from '../src/druid-talents.js';
import { BOSS_BONUS_LOOT_TABLES, NORMAL_LOOT_TABLES, rollBossBonusLoot, rollNormalLoot } from '../src/loot.js';
import { canEquipItem } from '../src/item-model.js';
import { pathToFileURL } from 'node:url';

const samples = Number(process.argv[2] || 40);
const clearPoints = (process.env.CLEAR_POINTS || '0,1,2,4,5').split(',').map(Number);
const selectedChapters = (process.env.CHAPTERS || '1,2,3,4').split(',').map(Number);
const selectedHealers = (process.env.HEALERS || 'druid,priest').split(',');
const priorFarmingClears = Number(process.env.PRIOR_FARMING_CLEARS ?? 0);
const skillProfile = process.env.SKILL_PROFILE || 'veryGood';
const inheritanceModel = process.env.INHERITANCE_MODEL || 'legacy';
const bossHpScale = Number(process.env.BOSS_HP_SCALE || 1);
const bossDamageScale = Number(process.env.BOSS_DAMAGE_SCALE || 1);
if (!['legacy', 'recursive'].includes(inheritanceModel)) throw new Error(`Unknown inheritance model: ${inheritanceModel}`);
const priestBuilds = [
  {},
  { 'conservation-of-faith': 1 },
  { 'conservation-of-faith': 2 },
  { 'conservation-of-faith': 2, 'post-haste': 1 },
  { 'conservation-of-faith': 2, 'post-haste': 2 },
  { 'conservation-of-faith': 2, 'post-haste': 2, 'lingering-prayer': 1 },
  { 'conservation-of-faith': 2, 'post-haste': 2, 'lingering-prayer': 1, 'threefold-penance': 1 },
];
const druidBuilds = [
  {},
  { 'preserved-growth': 1 },
  { 'preserved-growth': 1, 'empowered-rejuvenation': 1 },
  { 'preserved-growth': 1, 'empowered-rejuvenation': 2 },
  { 'preserved-growth': 1, 'empowered-rejuvenation': 2, 'passing-bloom': 1 },
  { 'preserved-growth': 1, 'empowered-rejuvenation': 2, 'passing-bloom': 1, 'blooming-swiftmend': 1 },
  { 'preserved-growth': 1, 'empowered-rejuvenation': 2, 'passing-bloom': 1, 'blooming-swiftmend': 1, 'living-rejuvenation': 1 },
];
export function allocations(healerId, chapterIndex, earnedFirstPoint, variant) {
  const builds = healerId === 'priest' ? priestBuilds : druidBuilds;
  const base = builds[chapterIndex * 2 + (earnedFirstPoint && chapterIndex < 3 ? 1 : 0)];
  return chapterIndex === 3 && earnedFirstPoint ? { ...base, [variant]: 1 } : base;
}
export const seeded = initial => {
  let value = initial >>> 0;
  return () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
};
export const routes = chapter => {
  const boss = chapter.nodes.find(node => node.kind === 'boss');
  const walk = node => node.from.length
    ? node.from.flatMap(id => walk(chapter.nodes.find(candidate => candidate.id === id)).map(path => [...path, node]))
    : [[node]];
  return walk(boss).map(route => route.slice(0, -1));
};
const owners = ['tank', 'rogue', 'mage', 'ranger'];
function itemScore(item, member) {
  const stats = item.stats;
  const healer = member === 'priest' || member === 'druid';
  return healer
    ? (stats.maxHp || 0) / 30 + (stats.maxMana || 0) / 35 + (stats.manaRegen || 0) * 8
      + (stats.spellPower || 0) / 5 + (stats.haste || 0) / 2 + (stats.crit || 0) / 2
      + (stats.armor || 0) / 3 + (stats.resistance || 0) / 3
    : (stats.damage || 0) * 3 + (stats.maxHp || 0) / (member === 'tank' ? 35 : 55)
      + (stats.armor || 0) / (member === 'tank' ? 2 : 4) + (stats.resistance || 0) / 5;
}
export function equipExpected(equipment, healerId) {
  // One owned fixed item can occupy one slot on one character. Prefer its
  // authored owner unless another compatible character gains much more.
  const candidates = [...equipment.collection()].flatMap(item => [healerId, ...owners]
    .filter(owner => canEquipItem(owner, item.slot, item))
    .map(owner => ({ item, owner, score: itemScore(item, owner) + (item.owner === owner ? 0.3 : 0) })));
  candidates.sort((a, b) => b.score - a.score);
  const used = new Set(), slots = new Set();
  for (const candidate of candidates) {
    const slot = `${candidate.owner}:${candidate.item.slot}`;
    if (used.has(candidate.item.id) || slots.has(slot)) continue;
    used.add(candidate.item.id); slots.add(slot);
    equipment.equip({ id: candidate.owner }, candidate.item.slot, candidate.item.id);
  }
}
export function regeared(equipment, healerId) {
  const next = new Equipment(null);
  for (const item of equipment.collection()) next.acquire(item.id);
  equipExpected(next, healerId);
  return next;
}
export const SKILL_PROFILES = Object.freeze({
  veryGood: { decisionInterval: .12, healThreshold: 1, offensiveManaFloor: .8 },
  average: { decisionInterval: .2, healThreshold: .8, offensiveManaFloor: .9 },
  weak: { decisionInterval: .3, healThreshold: .75, offensiveManaFloor: 1 },
});
export function chooseCast(game, healerId, profile = 'veryGood') {
  if (game.cast || game.status !== 'running') return;
  const policy = SKILL_PROFILES[profile];
  if (!policy) throw new Error(`Unknown skill profile: ${profile}`);
  const threshold = value => value * policy.healThreshold;
  const living = game.party.filter(member => member.hp > 0);
  const lowest = [...living].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  const missing = member => member.maxHp - member.hp;
  const injured = living.filter(member => missing(member) > threshold(55));
  const can = id => (game.cooldowns[id] || 0) <= game.time + 1e-6;
  if (healerId === 'priest') {
    if (injured.length >= 3 && can('sanctuary') && game.begin('sanctuary', lowest.id).ok) return;
    if (profile === 'weak' && missing(lowest) >= threshold(160) && game.begin('flash', lowest.id).ok) return;
    if (missing(lowest) >= threshold(100) && can('penance') && game.begin('penance', lowest.id).ok) return;
    if (injured.length >= 3 && injured.reduce((sum, member) => sum + Math.min(100, missing(member)), 0) >= threshold(240) && game.begin('prayer', lowest.id).ok) return;
    if (missing(game.party[0]) >= threshold(140) && game.begin('greater', 'tank').ok) return;
    if (missing(lowest) >= threshold(105) && game.begin('flash', lowest.id).ok) return;
    if (game.mana > game.maxMana * policy.offensiveManaFloor && can('holyFire')) game.begin('holyFire', 'boss');
  } else {
    if (profile === 'weak' && missing(lowest) >= threshold(180) && game.begin('nourish', lowest.id).ok) return;
    if (injured.length >= 3 && injured.reduce((sum, member) => sum + Math.min(150, missing(member)), 0) >= threshold(320) && can('tranquility') && game.begin('tranquility', lowest.id).ok) return;
    if (injured.length >= 3 && injured.reduce((sum, member) => sum + Math.min(100, missing(member)), 0) >= threshold(270) && can('wildGrowth') && game.begin('wildGrowth', lowest.id).ok) return;
    if (missing(lowest) >= threshold(115) && can('swiftmend') && game.activeHots(lowest, ['rejuvenation', 'regrowth', 'wildGrowth']).length && game.begin('swiftmend', lowest.id).ok) return;
    if (missing(lowest) >= threshold(180) && !game.activeHots(lowest, ['regrowth']).length && game.begin('regrowth', lowest.id).ok) return;
    const tank = game.party[0];
    const maxRejuv = game.spells.find(spell => spell.id === 'rejuvenation')?.hot?.maxInstances || 1;
    if (missing(tank) >= threshold(maxRejuv > 1 && game.activeHots(tank, ['rejuvenation']).length ? 240 : 100) && game.activeHots(tank, ['rejuvenation']).length < maxRejuv && game.begin('rejuvenation', tank.id).ok) return;
    const hot = game.activeHots(lowest, ['rejuvenation']).length;
    if (missing(lowest) >= threshold(hot ? 240 : 130) && hot < maxRejuv && game.begin('rejuvenation', lowest.id).ok) return;
    if (missing(lowest) >= threshold(115)) game.begin('nourish', lowest.id);
  }
}
export function fight(encounter, equipment, healerId, random, resources, talentBuild, profile = 'veryGood') {
  const loadout = (healerId === 'priest' ? priestTalentLoadout : druidTalentLoadout)(equipment.party(healerId), HEALERS[healerId].combatSpells, talentBuild);
  const game = new Combat(encounter, random, loadout.party, loadout.spells);
  if (resources) game.reset(encounter, resources);
  game.start();
  const casts = {};
  let nextDecision = 0;
  while (game.status === 'running') {
    if (game.time >= nextDecision) { chooseCast(game, healerId, profile); nextDecision = game.time + SKILL_PROFILES[profile].decisionInterval; }
    game.step();
    for (const event of game.drainEvents()) if (event.type === 'cast') casts[event.spell] = (casts[event.spell] || 0) + 1;
  }
  game.castCounts = casts;
  return game;
}
export function acquireRoute(chapter, route, equipment, healerId, random) {
  for (const node of route) for (const item of rollNormalLoot(NORMAL_LOOT_TABLES[node.encounter], equipment.ownedIds, healerId, random)) equipment.acquire(item.id);
}
// A profile finishes each earlier chapter at its own readiness point, wins the
// boss, then optionally farms that chapter again before moving on. The same
// equipment instance carries forward through every chapter in sequence.
export function readinessClears(profile, seed, chapterIndex) {
  if (profile === 'veryGood') return 2;
  if (profile === 'average') return 3;
  if (profile === 'weak') return 4 + (seed + chapterIndex) % 2;
  throw new Error(`Unknown skill profile: ${profile}`);
}
export function extraClearsAfterBoss(profile, seed, chapterIndex) {
  if (profile === 'veryGood') return 0;
  if (profile === 'average') return (seed + chapterIndex) % 2;
  if (profile === 'weak') return 1 + (seed + chapterIndex) % 2;
  throw new Error(`Unknown skill profile: ${profile}`);
}
export function recursiveInheritedEquipment(chapterIndex, healerId, profile, seed, random) {
  let equipment = new Equipment(null);
  const history = [];
  for (let previous = 0; previous < chapterIndex; previous++) {
    const chapter = CHAPTERS[previous], paths = routes(chapter);
    const readiness = readinessClears(profile, seed, previous);
    const extra = extraClearsAfterBoss(profile, seed, previous);
    for (let clear = 0; clear < readiness; clear++) acquireRoute(chapter, paths[Math.floor(random() * paths.length)], equipment, healerId, random);
    acquireRoute(chapter, paths[Math.floor(random() * paths.length)], equipment, healerId, random);
    const boss = chapter.nodes.find(node => node.kind === 'boss');
    for (const item of rollNormalLoot(NORMAL_LOOT_TABLES[boss.encounter], equipment.ownedIds, healerId, random)) equipment.acquire(item.id);
    for (const item of rollBossBonusLoot(BOSS_BONUS_LOOT_TABLES[boss.encounter], equipment.ownedIds, healerId, random)) equipment.acquire(item.id);
    for (let clear = 0; clear < extra; clear++) acquireRoute(chapter, paths[Math.floor(random() * paths.length)], equipment, healerId, random);
    equipment = regeared(equipment, healerId);
    const equipped = Object.values(equipment.equipped).flatMap(slots => Object.values(slots));
    history.push({ chapter: previous + 1, readinessClears: readiness, extraClears: extra,
      equippedCountAfter: equipped.length, chapterEquippedCountAfter: equipped.filter(id => equipment.itemById(id).chapter === previous + 1).length });
  }
  return { equipment, history };
}
function trial(chapterIndex, healerId, clearCount, seed, variant) {
  const random = seeded(seed);
  let equipment = inheritanceModel === 'recursive'
    ? recursiveInheritedEquipment(chapterIndex, healerId, skillProfile, seed, random).equipment
    : new Equipment(null);
  for (let previous = 0; inheritanceModel === 'legacy' && previous < chapterIndex; previous++) {
    const chapter = CHAPTERS[previous], paths = routes(chapter);
    // Earlier chapters include farming routes plus the required boss approach.
    for (let clear = 0; clear < priorFarmingClears + 1; clear++) acquireRoute(chapter, paths[Math.floor(random() * paths.length)], equipment, healerId, random);
    const boss = chapter.nodes.find(node => node.kind === 'boss');
    for (const item of rollNormalLoot(NORMAL_LOOT_TABLES[boss.encounter], equipment.ownedIds, healerId, random)) equipment.acquire(item.id);
    for (const item of rollBossBonusLoot(BOSS_BONUS_LOOT_TABLES[boss.encounter], equipment.ownedIds, healerId, random)) equipment.acquire(item.id);
  }
  const chapter = CHAPTERS[chapterIndex], paths = routes(chapter);
  for (let clear = 0; clear < clearCount; clear++) acquireRoute(chapter, paths[Math.floor(random() * paths.length)], equipment, healerId, random);
  equipment = regeared(equipment, healerId);
  const gearCount = equipment.collection().filter(item => item.chapter === chapterIndex + 1).length;
  const equippedCount = Object.values(equipment.equipped).reduce((sum, slots) => sum + Object.keys(slots).length, 0);
  // The required approach route starts at full resources. Exact surviving
  // Health and Mana carry forward, while earned talents and drops become usable.
  const attemptRoute = paths[Math.floor(random() * paths.length)];
  let resources = null, routeOutcome = 'victory', routeSeconds = 0;
  for (const [nodeIndex, node] of attemptRoute.entries()) {
    const earnedFirstPoint = clearCount > 0 || nodeIndex > 0;
    const game = fight(CHAPTER_ENCOUNTERS[node.encounter], equipment, healerId, random, resources,
      allocations(healerId, chapterIndex, earnedFirstPoint, variant), skillProfile);
    if (process.env.TRACE && seed === 71000 + chapterIndex * 10000 + clearCount * 1000)
      console.error(chapterIndex + 1, healerId, clearCount, node.encounter, game.status, game.time,
        game.castCounts, Math.round(game.mana), game.party.map(member => Math.round(member.hp)));
    routeSeconds += game.time;
    if (game.status !== 'victory') { routeOutcome = game.status; break; }
    resources = game.resources();
    for (const item of rollNormalLoot(NORMAL_LOOT_TABLES[node.encounter], equipment.ownedIds, healerId, random)) equipment.acquire(item.id);
    equipment = regeared(equipment, healerId);
  }
  if (routeOutcome !== 'victory') return { win: false, routeOutcome, gearCount, equippedCount, routeSeconds };
  const initialMana = resources.mana.current;
  const initialHealth = Object.fromEntries(Object.entries(resources.health).map(([id, value]) => [id, value.current]));
  const bossEncounter = structuredClone(CHAPTER_ENCOUNTERS[chapter.nodes.find(node => node.kind === 'boss').encounter]);
  bossEncounter.maxHp *= bossHpScale;
  bossEncounter.strike.damage *= bossDamageScale;
  for (const add of bossEncounter.adds || []) add.damage *= bossDamageScale;
  for (const mechanic of bossEncounter.mechanics || []) {
    if (mechanic.damage) mechanic.damage *= bossDamageScale;
    if (mechanic.dot?.damage) mechanic.dot.damage *= bossDamageScale;
  }
  const boss = fight(bossEncounter, equipment, healerId, random, resources,
    allocations(healerId, chapterIndex, true, variant), skillProfile);
  if (process.env.TRACE_BOSS && seed === 71000 + chapterIndex * 10000 + clearCount * 1000)
    console.error('boss', chapterIndex + 1, healerId, variant, boss.status, boss.time,
      boss.castCounts, boss.stats, Math.round(boss.mana), boss.party.map(member => Math.round(member.hp)));
  return { win: boss.status === 'victory', routeOutcome, gearCount, equippedCount, routeSeconds,
    bossSeconds: boss.time, initialMana, initialHealth, finalMana: boss.mana, tankHealth: boss.party[0].hp,
    healerHealth: boss.healer.hp, dps: boss.party.filter(member => member.damage).reduce((sum, member) => sum + member.damage / member.interval, 0),
    loadout: equipment.equipped };
}
const average = (rows, key) => Math.round(rows.reduce((sum, row) => sum + (row[key] || 0), 0) / rows.length * 10) / 10;
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) for (let chapterIndex = 0; chapterIndex < CHAPTERS.length; chapterIndex++) if (selectedChapters.includes(chapterIndex + 1)) for (const healerId of selectedHealers) for (const variant of chapterIndex === 3
  ? (healerId === 'priest' ? ['twin-penance', 'sanctuary'] : ['twin-rejuvenation', 'tranquility']) : ['core']) for (const clears of clearPoints) {
  const rows = Array.from({ length: samples }, (_, index) => trial(chapterIndex, healerId, clears, 71000 + chapterIndex * 10000 + clears * 1000 + index, variant));
  const reached = rows.filter(row => row.routeOutcome === 'victory');
  const wins = rows.filter(row => row.win);
  const representative = [...(reached.length ? reached : rows)].sort((a, b) => Math.abs(a.gearCount - average(rows, 'gearCount')) - Math.abs(b.gearCount - average(rows, 'gearCount')))[0];
  console.log(JSON.stringify({ chapter: chapterIndex + 1, healer: healerId, variant, clears, samples, skillProfile, inheritanceModel,
    talents: allocations(healerId, chapterIndex, true, variant),
    routeRate: reached.length / samples, winRate: wins.length / samples,
    loot: average(rows, 'gearCount'), equipped: average(rows, 'equippedCount'), dps: average(rows, 'dps'),
    routeSeconds: average(rows, 'routeSeconds'), entryMana: average(reached, 'initialMana'),
    entryTankHp: average(reached.map(row => ({ value: row.initialHealth.tank })), 'value'),
    entryHealerHp: average(reached.map(row => ({ value: row.initialHealth.healer })), 'value'),
    bossSeconds: average(reached, 'bossSeconds'), winSeconds: average(wins, 'bossSeconds'),
    winMana: average(wins, 'finalMana'), ...(process.env.SHOW_LOADOUT && representative ? { loadout: representative.loadout } : {}) }));
}
