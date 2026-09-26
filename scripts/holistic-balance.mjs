// BAT-83: seeded normal-route and boss validation with final healer talents.
// node scripts/holistic-balance.mjs 100 > docs/bat-83-holistic.jsonl
import { CHAPTERS, CHAPTER_ENCOUNTERS } from '../src/data.js';
import { NORMAL_LOOT_TABLES, rollNormalLoot } from '../src/loot.js';
import { acquireRoute, recursiveInheritedEquipment, regeared, routes, seeded } from './boss-balance.mjs';
import { builds, fight } from './talent-balance.mjs';

const samples = Number(process.argv[2] || 100);
const chapters = (process.env.CHAPTERS || '1,2,3,4').split(',').map(Number);
const healers = (process.env.HEALERS || 'priest,druid').split(',');
const profiles = (process.env.PROFILES || 'veryGood,average,weak').split(',');
const stages = (process.env.STAGES || 'first,one,ready').split(',');
// Optional encounter overrides make paired, fixed-seed tuning probes reproducible.
const encounterTuning = JSON.parse(process.env.ENCOUNTER_TUNING || '{}');
function tunedEncounter(id) {
  const encounter = structuredClone(CHAPTER_ENCOUNTERS[id]);
  const tuning = encounterTuning[id] || {};
  if (tuning.maxHp !== undefined) encounter.maxHp = tuning.maxHp;
  if (tuning.strikeDamage !== undefined) encounter.strike.damage = tuning.strikeDamage;
  if (tuning.strikeEvery !== undefined) encounter.strike.every = tuning.strikeEvery;
  if (tuning.strikeFirst !== undefined) encounter.strike.first = tuning.strikeFirst;
  if (tuning.mechanicScale !== undefined) for (const mechanic of encounter.mechanics) {
    if (mechanic.damage) mechanic.damage *= tuning.mechanicScale;
    if (mechanic.dot) mechanic.dot.damage *= tuning.mechanicScale;
  }
  if (tuning.mechanicDamage) for (const mechanic of encounter.mechanics) {
    if (tuning.mechanicDamage[mechanic.id] !== undefined) mechanic.damage = tuning.mechanicDamage[mechanic.id];
  }
  if (tuning.extraMechanic) encounter.mechanics.push(tuning.extraMechanic);
  return encounter;
}
const buildNames = { priest: ['1-binding', '3-binding', '5-penance', '7-fourfold'],
  druid: ['1-rejuvenation', '3-rejuvenation', '5-nourishment', '7-blooming'] };
const beforeFirstPoint = {
  priest: [{}, { 'binding-light': 2 },
    { 'binding-light': 2, 'conservation-of-faith': 2 },
    { 'binding-light': 2, 'conservation-of-faith': 2, 'focused-penance': 2 }],
  druid: [{}, { 'empowered-rejuvenation': 2 },
    { 'empowered-rejuvenation': 2, 'natural-regeneration': 2 },
    { 'empowered-rejuvenation': 2, 'natural-regeneration': 2, 'abundant-nourishment': 2 }],
};

const mean = (rows, value) => rows.length ? rows.reduce((sum, row) => sum + value(row), 0) / rows.length : null;
const rate = (rows, predicate) => mean(rows, row => Number(predicate(row)));
const rounded = value => value === null ? null : Math.round(value * 100) / 100;
const equippedItems = equipment => Object.values(equipment.equipped).flatMap(slots => Object.values(slots)).map(id => equipment.itemById(id));

function trial(chapterNumber, healer, profile, stage, index) {
  const seed = 183000 + chapterNumber * 100000 + index;
  const random = seeded(seed);
  const chapter = CHAPTERS[chapterNumber - 1];
  const paths = routes(chapter);
  let equipment = recursiveInheritedEquipment(chapterNumber - 1, healer, profile, seed, random).equipment;
  const clears = stage === 'first' ? 0 : stage === 'one' ? 1
    : profile === 'veryGood' ? 2 : profile === 'average' ? 3 : 4 + index % 2;
  for (let n = 0; n < clears; n++) {
    acquireRoute(chapter, paths[Math.floor(random() * paths.length)], equipment, healer, random);
    equipment = regeared(equipment, healer);
  }
  const items = equippedItems(equipment);
  const path = paths[Math.floor(random() * paths.length)];
  const buildName = process.env[`${healer.toUpperCase()}_BUILD`] || buildNames[healer][chapterNumber - 1];
  const build = builds[healer][buildName];
  if (!build) throw new Error(`Unknown ${healer} build: ${buildName}`);
  const result = { clears, currentItems: items.filter(item => item.chapter === chapterNumber).length,
    occupiedSlots: items.length, partyIlvl: items.reduce((sum, item) => sum + (item.itemLevel || 0), 0) / 27,
    route: path.map(node => node.encounter), stages: [], boss: null };
  let resources = null;
  for (const [position, node] of path.entries()) {
    // The first point in a new chapter is earned at its first normal encounter.
    const talentBuild = stage === 'first' && position === 0 ? beforeFirstPoint[healer][chapterNumber - 1] : build;
    const combat = fight(tunedEncounter(node.encounter), equipment, healer, talentBuild,
      Math.floor(random() * 2 ** 32), resources, profile);
    result.stages.push({ encounter: node.encounter, won: combat.won, seconds: combat.seconds,
      mana: combat.remainingMana, hp: Object.values(combat.resources.health).reduce((sum, value) => sum + value.current, 0),
      effective: combat.effective, overheal: combat.overheal, deaths: combat.deaths });
    if (!combat.won) return result;
    resources = combat.resources;
    for (const item of rollNormalLoot(NORMAL_LOOT_TABLES[node.encounter], equipment.ownedIds, healer, random)) equipment.acquire(item.id);
    equipment = regeared(equipment, healer);
  }
  const bossNode = chapter.nodes.find(node => node.kind === 'boss');
  const bossEncounter = tunedEncounter(bossNode.encounter);
  const strikeScale = Number(process.env.BOSS_STRIKE_SCALE || 1);
  const mechanicScale = Number(process.env.BOSS_MECHANIC_SCALE || 1);
  bossEncounter.strike.damage *= strikeScale;
  for (const mechanic of bossEncounter.mechanics) {
    if (mechanic.damage) mechanic.damage *= mechanicScale;
    if (mechanic.dot) mechanic.dot.damage *= mechanicScale;
  }
  const boss = fight(bossEncounter, equipment, healer, build,
    Math.floor(random() * 2 ** 32), resources, profile);
  result.boss = { won: boss.won, seconds: boss.seconds, mana: boss.remainingMana,
    entryMana: resources.mana.current,
    entryHp: Object.values(resources.health).reduce((sum, value) => sum + value.current, 0),
    entryTankHp: resources.health.tank.current, entryHealerHp: resources.health.healer.current,
    effective: boss.effective, overheal: boss.overheal, manaSpent: boss.manaSpent, deaths: boss.deaths,
    casts: boss.casts };
  return result;
}

function summarize(rows, chapterNumber, healer, profile, stage) {
  const reached = rows.filter(row => row.boss);
  const winners = reached.filter(row => row.boss.won);
  const paths = [...new Set(rows.map(row => row.route.join('/')))];
  return { chapter: chapterNumber, healer, profile, stage, samples: rows.length,
    clears: rounded(mean(rows, row => row.clears)),
    currentItems: rounded(mean(rows, row => row.currentItems)),
    occupiedSlots: rounded(mean(rows, row => row.occupiedSlots)),
    partyIlvl: rounded(mean(rows, row => row.partyIlvl)),
    routeCompletion: rate(rows, row => !!row.boss), bossWin: rate(rows, row => !!row.boss?.won),
    bossWinWhenReached: rate(reached, row => row.boss.won),
    bossEntryMana: rounded(mean(reached, row => row.boss.entryMana)),
    bossEntryHp: rounded(mean(reached, row => row.boss.entryHp)),
    bossEntryTankHp: rounded(mean(reached, row => row.boss.entryTankHp)),
    bossEntryHealerHp: rounded(mean(reached, row => row.boss.entryHealerHp)),
    bossSeconds: rounded(mean(reached, row => row.boss.seconds)),
    bossWinSeconds: rounded(mean(winners, row => row.boss.seconds)),
    bossWinMana: rounded(mean(winners, row => row.boss.mana)),
    bossEffectiveHealing: rounded(mean(reached, row => row.boss.effective)),
    bossOverheal: rounded(mean(reached, row => row.boss.overheal)),
    bossManaSpent: rounded(mean(reached, row => row.boss.manaSpent)),
    bossCasts: Object.fromEntries([...new Set(reached.flatMap(row => Object.keys(row.boss.casts)))].map(spell =>
      [spell, rounded(mean(reached, row => row.boss.casts[spell] || 0))])),
    routes: paths.map(key => { const subset = rows.filter(row => row.route.join('/') === key);
      return { encounters: key.split('/'), samples: subset.length, completion: rate(subset, row => !!row.boss) }; }),
    encounters: [...new Set(rows.flatMap(row => row.route))].map(encounter => {
      const played = rows.flatMap(row => row.stages.filter(fight => fight.encounter === encounter));
      return { encounter, reached: played.length / rows.length, winWhenReached: rate(played, fight => fight.won),
        seconds: rounded(mean(played, fight => fight.seconds)),
        endingManaOnWin: rounded(mean(played.filter(fight => fight.won), fight => fight.mana)),
        endingHpOnWin: rounded(mean(played.filter(fight => fight.won), fight => fight.hp)) };
    }) };
}

for (const chapter of chapters) for (const healer of healers) for (const profile of profiles) for (const stage of stages) {
  const rows = Array.from({ length: samples }, (_, index) => trial(chapter, healer, profile, stage, index));
  console.log(JSON.stringify(summarize(rows, chapter, healer, profile, stage)));
}
