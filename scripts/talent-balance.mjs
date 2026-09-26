// BAT-82: seeded, paired healer comparisons against provisional BAT-79 gear.
// node scripts/talent-balance.mjs [samples] > docs/bat-82-results.jsonl
import { CHAPTERS, CHAPTER_ENCOUNTERS, HEALERS } from '../src/data.js';
import { Combat } from '../src/combat.js';
import { priestTalentLoadout } from '../src/priest-talents.js';
import { druidTalentLoadout } from '../src/druid-talents.js';
import { acquireRoute, recursiveInheritedEquipment, regeared, routes, seeded } from './boss-balance.mjs';
import { pathToFileURL } from 'node:url';

export const builds = {
  priest: {
    '0-base': {},
    '1-binding': { 'binding-light': 1 },
    '1-mercy': { 'early-mercy': 1 },
    '3-binding': { 'binding-light': 2, 'conservation-of-faith': 1 },
    '3-mercy': { 'early-mercy': 2, 'conservation-of-faith': 1 },
    '5-penance': { 'binding-light': 2, 'conservation-of-faith': 2, 'focused-penance': 1 },
    '5-prayer': { 'binding-light': 2, 'conservation-of-faith': 2, 'lingering-prayer': 1 },
    '5-haste': { 'binding-light': 2, 'conservation-of-faith': 2, 'post-haste': 1 },
    '7-fourfold': { 'binding-light': 2, 'conservation-of-faith': 2, 'focused-penance': 2, 'fourfold-penance': 1 },
    '7-echo': { 'binding-light': 2, 'conservation-of-faith': 2, 'focused-penance': 2, 'echo-of-grace': 1 },
    '7-unspent': { 'binding-light': 2, 'conservation-of-faith': 2, 'focused-penance': 2, 'light-unspent': 1 },
    '8-twin': { 'binding-light': 2, 'conservation-of-faith': 2, 'focused-penance': 2, 'fourfold-penance': 1, 'twin-penance': 1 },
    '8-sanctuary': { 'binding-light': 2, 'conservation-of-faith': 2, 'focused-penance': 2, 'fourfold-penance': 1, sanctuary: 1 },
    '8-fervor': { 'binding-light': 2, 'conservation-of-faith': 2, 'focused-penance': 2, 'fourfold-penance': 1, 'divine-fervor': 1 },
  },
  druid: {
    '0-base': {},
    '1-rejuvenation': { 'empowered-rejuvenation': 1 },
    '1-touch': { 'nourishing-touch': 1 },
    '3-rejuvenation': { 'empowered-rejuvenation': 2, 'natural-regeneration': 1 },
    '3-touch': { 'nourishing-touch': 2, 'natural-regeneration': 1 },
    '5-nourishment': { 'empowered-rejuvenation': 2, 'natural-regeneration': 2, 'abundant-nourishment': 1 },
    '5-ward': { 'empowered-rejuvenation': 2, 'natural-regeneration': 2, 'cenarion-ward': 1 },
    '5-bloom': { 'empowered-rejuvenation': 2, 'natural-regeneration': 2, 'passing-bloom': 1 },
    '7-blooming': { 'empowered-rejuvenation': 2, 'natural-regeneration': 2, 'abundant-nourishment': 2, 'blooming-swiftmend': 1 },
    '7-overgrowth': { 'empowered-rejuvenation': 2, 'natural-regeneration': 2, 'abundant-nourishment': 2, overgrowth: 1 },
    '7-living': { 'empowered-rejuvenation': 2, 'natural-regeneration': 2, 'abundant-nourishment': 2, 'living-rejuvenation': 1 },
    '7-ward': { 'empowered-rejuvenation': 2, 'natural-regeneration': 2, 'cenarion-ward': 2, 'blooming-swiftmend': 1 },
    '8-twin': { 'empowered-rejuvenation': 2, 'natural-regeneration': 2, 'abundant-nourishment': 2, 'blooming-swiftmend': 1, 'twin-rejuvenation': 1 },
    '8-genesis': { 'empowered-rejuvenation': 2, 'natural-regeneration': 2, 'abundant-nourishment': 2, 'blooming-swiftmend': 1, genesis: 1 },
    '8-tranquility': { 'empowered-rejuvenation': 2, 'natural-regeneration': 2, 'abundant-nourishment': 2, 'blooming-swiftmend': 1, tranquility: 1 },
    '8-ward-genesis': { 'empowered-rejuvenation': 2, 'natural-regeneration': 2, 'cenarion-ward': 2, 'blooming-swiftmend': 1, genesis: 1 },
  },
};

const pointsForChapter = [1, 3, 5, 7];
const profiles = {
  focused: { strike: 1.2, split: 0, aoe: 0, burst: 0 },
  split: { strike: .75, split: 1, aoe: 0, burst: 0 },
  aoe: { strike: .7, split: 0, aoe: 1, burst: 0 },
  burst: { strike: .85, split: .5, aoe: .5, burst: 1 },
  attrition: { strike: .8, split: .5, aoe: .4, burst: 0 },
};

function scenario(chapter, name) {
  const baseline = CHAPTER_ENCOUNTERS[['warden', 'matriarch', 'regent', 'duchess'][chapter - 1]];
  const p = profiles[name];
  const pressureScale = Number(process.env.PRESSURE_SCALE || 1);
  const damage = baseline.strike.damage * (chapter >= 3 ? 1.3 : 1) * pressureScale;
  return { ...baseline, name: `${baseline.name} (${name})`, maxHp: Math.round(baseline.maxHp * (name === 'attrition' ? 1.6 : 1.35)),
    strike: { first: 2.4, every: 2.4, damage: Math.round(damage * p.strike) }, adds: [],
    mechanics: [
      ...(p.split ? [{ id: 'split', name: 'Split pressure', first: 7, every: 12, warning: 2, target: 'random', count: 2, damage: Math.round(damage * p.split) }] : []),
      ...(p.aoe ? [{ id: 'aoe', name: 'Party pressure', first: 10, every: 16, warning: 2, target: 'party', damage: Math.round(damage * p.aoe * .7) }] : []),
      ...(p.burst ? [{ id: 'burst', name: 'Burst window', first: 15, every: 30, warning: 3, target: 'tank', damage: Math.round(damage * p.burst * 1.75) }] : []),
    ] };
}

export function equipmentFor(chapter, healer, seed) {
  const random = seeded(seed);
  let equipment = recursiveInheritedEquipment(chapter - 1, healer, 'average', seed, random).equipment;
  const chapterData = CHAPTERS[chapter - 1], paths = routes(chapterData);
  for (let clear = 0; clear < 3; clear++) {
    acquireRoute(chapterData, paths[Math.floor(random() * paths.length)], equipment, healer, random);
    equipment = regeared(equipment, healer);
  }
  return equipment;
}

function decide(game, healer, skill = 'veryGood') {
  if (game.cast || game.status !== 'running') return;
  const threshold = value => value * ({ veryGood: 1, average: .85, weak: .75 }[skill] ?? 1);
  const living = game.party.filter(p => p.hp > 0);
  const byRatio = [...living].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  const lowest = byRatio[0], tank = game.party[0];
  const missing = p => p.maxHp - p.hp;
  const hurt = living.filter(p => missing(p) >= threshold(65));
  const can = id => game.spells.some(s => s.id === id) && game.begin(id, lowest.id).ok;
  if (healer === 'priest') {
    if (hurt.length >= 3 && can('sanctuary')) return;
    if (hurt.length >= 2 && can('divineFervor')) return;
    if (missing(lowest) >= threshold(95) && game.begin('penance', lowest.id).ok) return;
    if (hurt.length >= 3 && hurt.reduce((s, p) => s + Math.min(115, missing(p)), 0) >= threshold(250) && game.begin('prayer', lowest.id).ok) return;
    if (missing(tank) >= threshold(105) && tank.hp / tank.maxHp > .3 && game.begin('greater', tank.id).ok) return;
    if (missing(lowest) >= threshold(80) && game.begin('flash', lowest.id).ok) return;
  } else {
    const hots = p => game.activeHots(p, ['rejuvenation', 'regrowth', 'wildGrowth']);
    if (hurt.length >= 3 && can('tranquility')) return;
    if (hurt.length >= 3 && game.spells.some(s => s.id === 'genesis') && living.some(p => hots(p).length >= 1)
      && can('genesis')) return;
    if (game.spells.some(s => s.id === 'cenarionWard') && (game.availableCharges('cenarionWard') || 0) > 0
      && lowest.hp / lowest.maxHp <= .65 && !lowest.ward && game.begin('cenarionWard', lowest.id).ok) return;
    const wildGrowthCooling = (game.cooldowns.wildGrowth || 0) > game.time + 1e-6;
    if (hurt.length >= 3 && (!wildGrowthCooling || hurt.reduce((sum, p) => sum + missing(p), 0) >= threshold(400))
      && game.begin('wildGrowth', lowest.id).ok) return;
    if (missing(lowest) >= threshold(110) && hots(lowest).length && game.begin('swiftmend', lowest.id).ok) return;
    const regrowth = game.activeHots(lowest, ['regrowth']);
    if (missing(lowest) >= threshold(145) && (!regrowth.length || regrowth[0].expires - game.time < 4)
      && game.begin('regrowth', lowest.id).ok) return;
    const rejuvs = p => game.activeHots(p, ['rejuvenation']).length;
    const cap = game.spells.find(s => s.id === 'rejuvenation')?.hot?.maxInstances || 1;
    if (missing(tank) >= threshold(rejuvs(tank) ? 180 : 65) && rejuvs(tank) < cap
      && game.begin('rejuvenation', tank.id).ok) return;
    if (missing(lowest) >= threshold(80) && rejuvs(lowest) < cap && game.begin('rejuvenation', lowest.id).ok) return;
    const incomingSoon = lowest.id === 'tank' ? game.encounter.strike.damage * 1.5 : 45;
    const pendingSoon = hots(lowest).concat(game.activeHots(lowest, ['nourish']))
      .reduce((sum, hot) => sum + hot.heal * Math.min(hot.ticks, Math.ceil(4 / hot.interval)), 0);
    if (missing(lowest) >= threshold(90) && missing(lowest) + incomingSoon - pendingSoon >= threshold(95)
      && game.begin('nourish', lowest.id).ok) return;
  }
}

export function fight(encounter, equipment, healer, build, seed, resources, skill = 'veryGood', captureTimes = []) {
  const baseParty = equipment.party(healer);
  const loadout = (healer === 'priest' ? priestTalentLoadout : druidTalentLoadout)(baseParty, HEALERS[healer].combatSpells, build);
  if (process.env.BALANCE_VERSION === 'original' && healer === 'druid') {
    loadout.party = loadout.party.map((member, index) => member.label === 'HEALER'
      ? { ...member, manaRegen: baseParty[index].manaRegen * (1 + (build['natural-regeneration'] || 0) * .1) }
      : member);
    loadout.spells = loadout.spells.map(spell => {
    if (spell.id === 'nourish') return { ...spell, hotBonus: { ...spell.hotBonus,
      amount: spell.hotBonus.amount - (build['abundant-nourishment'] || 0) * 10 } };
    if (spell.id === 'wildGrowth') return { ...spell, hot: { ...spell.hot, heal: 10 } };
    return spell;
    });
  }
  const game = new Combat(encounter, seeded(seed), loadout.party, loadout.spells);
  if (resources) game.reset(encounter, resources);
  const entryResources = game.resources();
  const entryPower = {
    maxMana: game.maxMana, manaRegen: game.healer.manaRegen, spellPower: game.spellPower,
    party: loadout.party.map(({ id, maxHp, armor, resistance, damage, interval, haste, crit }) =>
      ({ id, maxHp, armor, resistance, damage, interval, haste, crit })),
  };
  game.start();
  let rawHealing = 0, partyDamage = 0, manaSpent = 0, depletedAt = null;
  const casts = {}, bySpell = {}, windows = [0, 0];
  const checkpoints = [];
  let previousMana = game.mana;
  let nextDecision = 0;
  while (game.status === 'running') {
    if (game.time >= nextDecision) { decide(game, healer, skill); nextDecision = game.time + ({ veryGood: .12, average: .2, weak: .3 }[skill] ?? .12); }
    game.step();
    if (checkpoints.length < captureTimes.length && game.time >= captureTimes[checkpoints.length]) {
      checkpoints.push({ at: captureTimes[checkpoints.length], seconds: game.time,
        mana: game.mana, bossHp: game.boss.hp, resources: game.resources() });
    }
    for (const e of game.drainEvents()) {
      if (e.type === 'heal') { rawHealing += e.raw; bySpell[e.spell] = (bySpell[e.spell] || 0) + e.amount; windows[game.time < 20 ? 0 : 1] += e.amount; }
      if (e.type === 'damage' && e.target !== 'boss') partyDamage += e.amount;
      if (e.type === 'cast') casts[e.spell] = (casts[e.spell] || 0) + 1;
    }
    if (game.mana < previousMana) manaSpent += previousMana - game.mana;
    previousMana = game.mana;
    if (depletedAt === null && game.mana < 30) depletedAt = game.time;
  }
  return { won: game.status === 'victory', seconds: game.time, effective: game.stats.effective,
    rawHealing, overheal: game.stats.overheal, partyDamage, manaSpent, remainingMana: game.mana,
    depletedAt, burstHps: windows[0] / Math.min(20, game.time), sustainedHps: windows[1] / Math.max(1, game.time - 20),
    casts, bySpell, deaths: game.stats.deaths, resources: game.resources(), entryResources, entryPower, checkpoints };
}

const mean = (rows, field) => rows.length ? rows.reduce((sum, row) => sum + (typeof field === 'function' ? field(row) : row[field]), 0) / rows.length : null;
function summary(rows) {
  const aggregate = key => Object.fromEntries([...new Set(rows.flatMap(row => Object.keys(row[key])))].map(id => [id, mean(rows, row => row[key][id] || 0)]));
  return { samples: rows.length, completion: mean(rows, 'won'), effective: mean(rows, 'effective'), rawHealing: mean(rows, 'rawHealing'),
    overheal: mean(rows, 'overheal'), partyDamage: mean(rows, 'partyDamage'), manaSpent: mean(rows, 'manaSpent'),
    hpm: rows.reduce((sum, row) => sum + row.effective, 0) / Math.max(1, rows.reduce((sum, row) => sum + row.manaSpent, 0)),
    remainingMana: mean(rows, 'remainingMana'), depletionTime: mean(rows.filter(row => row.depletedAt !== null), 'depletedAt') || null,
    depletionRate: rows.filter(row => row.depletedAt !== null).length / rows.length,
    burstHps: mean(rows, 'burstHps'), sustainedHps: mean(rows, 'sustainedHps'),
    deaths: mean(rows, 'deaths'), casts: aggregate('casts'), effectiveBySpell: aggregate('bySpell') };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const samples = Number(process.argv[2] || 100);
  const chapters = (process.env.CHAPTERS || '1,2,3,4').split(',').map(Number);
  const profileNames = (process.env.PROFILES || Object.keys(profiles).join(',')).split(',');
  const buildFilter = process.env.BUILD_FILTER?.split(',');
  for (const chapter of chapters) for (const healer of ['priest', 'druid']) for (const profile of profileNames) {
    const targetPoints = pointsForChapter[chapter - 1];
    const selected = Object.entries(builds[healer]).filter(([name]) => (name.startsWith(`${targetPoints}-`) || name === '0-base' || chapter === 4 && name.startsWith('8-'))
      && (!buildFilter || buildFilter.includes(name)));
    const encounter = scenario(chapter, profile);
    for (const [buildName, build] of selected) {
      const rows = [];
      for (let i = 0; i < samples; i++) {
        const seed = 82000 + chapter * 10000 + i;
        const equipment = equipmentFor(chapter, healer, seed);
        const random = seeded(seed + 777);
        const prior = scenario(chapter, 'focused');
        // A lighter previous fight supplies actual carried Health/Mana instead of
        // constructing a synthetic starting resource percentage.
        prior.maxHp = Math.round(prior.maxHp * .2);
        prior.strike.damage = Math.round(prior.strike.damage * .4);
        const carry = fight(prior, equipment, healer, build, Math.floor(random() * 2 ** 32)).resources;
        rows.push(fight(encounter, equipment, healer, build, seed + 999, carry));
      }
      console.log(JSON.stringify({ chapter, healer, profile, build: buildName, points: Object.values(build).reduce((a, b) => a + b, 0), ...summary(rows) }));
    }
  }
}
