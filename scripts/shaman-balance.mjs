// BAT-87. Real Combat, fixed seeds, no production stat/encounter mutation.
// node scripts/shaman-balance.mjs [samples=30] [controlled|routes|marginal]
import { pathToFileURL } from 'node:url';
import { Combat } from '../src/combat.js';
import { CONFIG, CHAPTERS, CHAPTER_ENCOUNTERS, HEALERS, partyForHealer } from '../src/data.js';
import { TALENT_TREES } from '../src/talent-trees.js';
import { TALENT_ROW_REQUIREMENTS } from '../src/talents.js';
import { priestTalentLoadout } from '../src/priest-talents.js';
import { druidTalentLoadout } from '../src/druid-talents.js';
import { shamanTalentLoadout } from '../src/shaman-talents.js';
import { rollNormalLoot, NORMAL_LOOT_TABLES } from '../src/loot.js';
import { builds as oldBuilds, decide } from './talent-balance.mjs';
import { seeded, routes, recursiveInheritedEquipment, acquireRoute, regeared } from './boss-balance.mjs';
import { decideShaman, shamanBuilds } from './shaman-policy.mjs';

export const builds = { priest: { ...oldBuilds.priest }, druid: { ...oldBuilds.druid }, shaman: shamanBuilds };
for (const [name, talent] of Object.entries({ sanctuary: 'sanctuary', fervor: 'divine-fervor', twin: 'twin-penance' })) {
  const { 'fourfold-penance': removed, ...core } = builds.priest['7-fourfold'];
  builds.priest[`7-${name}`] = { ...core, [talent]: 1 };
}
for (const talent of ['genesis', 'tranquility', 'twin-rejuvenation']) {
  const { 'blooming-swiftmend': removed, ...core } = builds.druid['7-blooming'];
  builds.druid[`7-${talent}`] = { ...core, [talent]: 1 };
}
const loadouts = { priest: priestTalentLoadout, druid: druidTalentLoadout, shaman: shamanTalentLoadout };
export function validateBuild(healer, build) {
  let spent = 0;
  for (const talent of TALENT_TREES[healer]) {
    const rank = build[talent.id] || 0;
    if (!Number.isInteger(rank) || rank < 0 || rank > (talent.maxRank || 1)) throw new Error(`Invalid rank ${talent.id}`);
    if (rank && spent < TALENT_ROW_REQUIREMENTS[talent.row - 1]) throw new Error(`Locked row ${talent.id}`);
    spent += rank;
  }
  if (spent > 8 || Object.keys(build).some(id => !TALENT_TREES[healer].some(t => t.id === id))) throw new Error('Invalid build');
  return spent;
}
for (const [healer, entries] of Object.entries(builds)) for (const [name, build] of Object.entries(entries)) {
  if (validateBuild(healer, build) !== Number(name.split('-')[0])) throw new Error(`Wrong points ${name}`);
}

export function gearFor(chapter, healer, seed, clears = 3, skill = 'average') {
  const random = seeded(seed), chapterData = CHAPTERS[chapter - 1], paths = routes(chapterData);
  let equipment = recursiveInheritedEquipment(chapter - 1, healer, skill, seed, random).equipment;
  for (let i = 0; i < clears; i++) {
    acquireRoute(chapterData, paths[Math.floor(random() * paths.length)], equipment, healer, random);
    equipment = regeared(equipment, healer);
  }
  return equipment;
}

// Borrow an actual Priest equipment-derived party and change healer identity
// only. All max Health/Mana/SP/regen/defense/DPS stats are identical pre-talents.
const referenceParties = new Map();
export function equivalentParty(chapter, healer, seed) {
  const key = `${chapter}:${seed}`;
  if (!referenceParties.has(key)) referenceParties.set(key, gearFor(chapter, 'priest', seed).party('priest'));
  const reference = referenceParties.get(key);
  const identity = partyForHealer(healer).find(p => p.label === 'HEALER');
  return reference.map(p => p.label === 'HEALER' ? { ...p, id: identity.id, name: identity.name, class: identity.class } : { ...p });
}

export const profiles = {
  focused: { strike: 1.2 }, split: { strike: .55, count: 2, split: .6, splitEvery: 6 },
  three: { strike: .4, count: 3, split: .5, splitEvery: 6 }, aoe: { strike: .15, aoe: .35, aoeEvery: 4 },
  attrition: { strike: .8, count: 2, split: .6, aoe: .4 },
  burst: { strike: .85, count: 2, split: .5, aoe: .5, burst: 1.75 },
  long: { strike: .75, count: 2, split: .4, aoe: .35 },
  // Supplemental diagnostic: large party wounds with time between hits.
  groupBurst: { strike: .15, aoe: .75, aoeEvery: 12 },
};
export function controlledEncounter(chapter, profile, scale = 1) {
  const p = profiles[profile];
  if (!p) throw new Error(`Unknown profile ${profile}`);
  const boss = CHAPTER_ENCOUNTERS[['warden', 'matriarch', 'regent', 'duchess'][chapter - 1]];
  const damage = boss.strike.damage * (chapter >= 3 ? 1.3 : 1) * scale;
  return { name: `Controlled ${profile}`, maxHp: 1e8, adds: [],
    strike: { first: 2.4, every: 2.4, damage: damage * p.strike },
    mechanics: [
      ...(p.split ? [{ id: 'split', name: 'Split', first: 7, every: p.splitEvery || 12, warning: 2, target: 'random', count: p.count, damage: damage * p.split }] : []),
      ...(p.aoe ? [{ id: 'aoe', name: 'AoE', first: 10, every: p.aoeEvery || 16, warning: 2, target: 'party', damage: damage * p.aoe }] : []),
      ...(p.burst ? [{ id: 'burst', name: 'Burst', first: 15, every: 30, warning: 3, target: 'tank', damage: damage * p.burst }] : []),
    ] };
}

// Before/after reproducibility uses immutable loadout overrides, never writes
// data.js. Filled with original values for every shipped numerical change.
export function balanceLoadout(party, healer, build, version = 'current') {
  const loadout = loadouts[healer](party, HEALERS[healer].combatSpells, build);
  if (!['current', 'original'].includes(version)) throw new Error(`Unknown version ${version}`);
  if (version === 'original' && healer === 'shaman') loadout.spells = loadout.spells.map(spell => {
    if (spell.id === 'recurringSurge') return { ...spell, hot: { ...spell.hot, heal: 44 }, ...(spell.echoingSurge ? { echoingSurge: .50 } : {}) };
    if (spell.id === 'healingWave') return { ...spell, heal: 110, cost: 28 / CONFIG.baseMana, ...(spell.ancestralEcho ? { ancestralEcho: .40 } : {}), ...(spell.earthlivingDuration ? { earthlivingHealingRatio: 1 } : {}) };
    if (spell.id === 'chainHeal') return { ...spell, chain: { ...spell.chain, jumpRatio: 1 - [.20, .175, .15][build['high-tide'] || 0] }, ...(spell.earthlivingDuration ? { earthlivingHealingRatio: 1 } : {}) };
    if (spell.id === 'riptide') return { ...spell, cost: 32 / CONFIG.baseMana };
    if (spell.id === 'healingTide') return { ...spell, cost: 80 / CONFIG.baseMana, totem: { ...spell.totem, heal: 14, duration: 8 } };
    return spell;
  });
  if (healer === 'shaman') {
    const tuning = JSON.parse(process.env.SHAMAN_TUNING || '{}');
    loadout.spells = loadout.spells.map(spell => {
      const changes = tuning[spell.id];
      if (!changes) return spell;
      const applicable = { ...changes };
      if (!spell.ancestralEcho) delete applicable.ancestralEcho;
      if (!spell.echoingSurge) delete applicable.echoingSurge;
      if (!spell.earthlivingDuration) delete applicable.earthlivingHealingRatio;
      return { ...spell, ...applicable,
        ...(changes.hot ? { hot: { ...spell.hot, ...changes.hot } } : {}),
        ...(changes.totem ? { totem: { ...spell.totem, ...changes.totem } } : {}) };
    });
  }
  return loadout;
}

export function simulate(encounter, party, healer, build, seed, resources = null, options = {}) {
  validateBuild(healer, build);
  const { version = 'current', skill = 'veryGood', seconds = Infinity, omit = [], policy = null } = options;
  const loadout = balanceLoadout(party, healer, build, version);
  const game = new Combat(encounter, seeded(seed), loadout.party, loadout.spells.filter(s => !omit.includes(s.id)));
  if (resources) game.reset(encounter, resources);
  const entryResources = game.resources();
  // Track real debits (including instant casts before step, and channel costs).
  // Net Mana deltas incorrectly subtract regeneration from reported HPM costs.
  let mana = game.mana, manaSpent = 0;
  Object.defineProperty(game, 'mana', { get: () => mana, set: value => { manaSpent += Math.max(0, mana - value); mana = value; }, configurable: true });
  const casts = {}, bySpell = {}, rawBySpell = {}, empoweredCasts = {}, wavesCasts = {};
  const counters = { riptideMoves: 0, movedBudget: 0, surgeBankSeconds: 0, riptideCoverageSeconds: 0,
    streamSeconds: 0, tideSeconds: 0, totemOverlapSeconds: 0, chainWhileTide: 0 };
  const originalBegin = game.begin.bind(game);
  game.begin = (id, target) => {
    const spell = game.spells.find(s => s.id === id), resolved = spell && game.resolveCast(spell);
    const result = originalBegin(id, target);
    if (result.ok) {
      if (resolved.unleashLife) empoweredCasts[id] = (empoweredCasts[id] || 0) + 1;
      if (resolved.tidalWaves) wavesCasts[id] = (wavesCasts[id] || 0) + 1;
      if (id === 'chainHeal' && game.tideTotem) counters.chainWhileTide++;
    }
    return result;
  };
  let nextDecision = 0, depletedAt = null, partyDamage = 0;
  game.start();
  while (game.status === 'running' && game.time < seconds - 1e-8) {
    if (game.time >= nextDecision) {
      (policy || (healer === 'shaman' ? decideShaman : g => decide(g, healer, skill)))(game, skill);
      nextDecision = game.time + ({ veryGood: .12, average: .2, weak: .3 }[skill] ?? .12);
    }
    game.step();
    counters.surgeBankSeconds += CONFIG.step * Number(game.activeHots(game.party[0], ['recurringSurge']).length > 0);
    counters.riptideCoverageSeconds += CONFIG.step * game.party.filter(p => game.activeHots(p, ['riptide']).length > 0).length;
    counters.streamSeconds += CONFIG.step * Number(!!game.totem);
    counters.tideSeconds += CONFIG.step * Number(!!game.tideTotem);
    counters.totemOverlapSeconds += CONFIG.step * Number(!!game.totem && !!game.tideTotem);
    for (const e of game.drainEvents()) {
      if (e.type === 'cast') casts[e.spell] = (casts[e.spell] || 0) + 1;
      if (e.type === 'heal') { bySpell[e.spell] = (bySpell[e.spell] || 0) + e.amount; rawBySpell[e.spell] = (rawBySpell[e.spell] || 0) + e.raw; }
      if (e.type === 'damage' && e.target !== 'boss') partyDamage += e.amount;
      if (e.type === 'buff' && e.source === 'flowingRiptide') { counters.riptideMoves++; counters.movedBudget += e.amount; }
    }
    if (depletedAt === null && game.mana < 30) depletedAt = game.time;
  }
  return { won: game.status === 'victory', survived: game.party.every(p => p.hp > 0) && (game.status === 'running' || game.status === 'victory'),
    seconds: game.time, effective: game.stats.effective, overheal: game.stats.overheal, rawHealing: game.stats.effective + game.stats.overheal,
    partyDamage, manaSpent, remainingMana: game.mana, depletedAt, deaths: game.stats.deaths,
    casts, bySpell, rawBySpell, empoweredCasts, wavesCasts, counters, resources: game.resources(), entryResources };
}

export const mean = (rows, field) => rows.length ? rows.reduce((sum, r) => sum + (typeof field === 'function' ? field(r) : r[field]), 0) / rows.length : null;
export function summary(rows) {
  const aggregate = key => Object.fromEntries([...new Set(rows.flatMap(r => Object.keys(r[key])))].map(id => [id, mean(rows, r => r[key][id] || 0)]));
  const depleted = rows.filter(r => r.depletedAt !== null);
  return { samples: rows.length, completion: mean(rows, 'won'), survival: mean(rows, 'survived'),
    ...Object.fromEntries(['seconds', 'effective', 'rawHealing', 'overheal', 'partyDamage', 'manaSpent', 'remainingMana', 'deaths'].map(k => [k, mean(rows, k)])),
    hps: mean(rows, 'effective') / mean(rows, 'seconds'), hpm: mean(rows, 'effective') / Math.max(1, mean(rows, 'manaSpent')),
    depletionRate: depleted.length / rows.length, depletionTime: mean(depleted, 'depletedAt'),
    casts: aggregate('casts'), effectiveBySpell: aggregate('bySpell'), rawBySpell: aggregate('rawBySpell'),
    empoweredCasts: aggregate('empoweredCasts'), wavesCasts: aggregate('wavesCasts'), interactions: aggregate('counters') };
}

const defaults = { priest: ['1-binding', '3-binding', '5-penance', '7-fourfold'], druid: ['1-rejuvenation', '3-rejuvenation', '5-nourishment', '7-blooming'],
  shaman: ['1-reserves', '3-waves', '5-flow', '7-earth'] };
export function routeTrial(chapter, healer, skill, stage, index, buildName = defaults[healer][chapter - 1], version = 'current') {
  const seed = 187000 + chapter * 100000 + index, random = seeded(seed), chapterData = CHAPTERS[chapter - 1];
  const paths = routes(chapterData), clears = stage === 'first' ? 0 : stage === 'one' ? 1 : skill === 'veryGood' ? 2 : skill === 'average' ? 3 : 4 + index % 2;
  let equipment = recursiveInheritedEquipment(chapter - 1, healer, skill, seed, random).equipment;
  for (let i = 0; i < clears; i++) { acquireRoute(chapterData, paths[Math.floor(random() * paths.length)], equipment, healer, random); equipment = regeared(equipment, healer); }
  const path = paths[Math.floor(random() * paths.length)], boss = chapterData.nodes.find(n => n.kind === 'boss');
  const build = builds[healer][buildName];
  if (!build) throw new Error(`Unknown ${healer} build ${buildName}`);
  // Before the chapter's first point, remove the last rank in tree order.
  const prior = { ...build }, last = [...TALENT_TREES[healer]].reverse().find(t => prior[t.id]);
  if (last && --prior[last.id] === 0) delete prior[last.id];
  const encounters = [];
  let resources = null, bossEntryMana = null;
  for (const [position, node] of [...path, boss].entries()) {
    const result = simulate(CHAPTER_ENCOUNTERS[node.encounter], equipment.party(healer), healer,
      stage === 'first' && position === 0 ? prior : build, Math.floor(random() * 2 ** 32), resources, { skill, version });
    if (node === boss) bossEntryMana = result.entryResources.mana.current;
    encounters.push({ encounter: node.encounter, boss: node === boss, ...result });
    if (!result.won) break;
    resources = result.resources;
    if (node !== boss) {
      for (const item of rollNormalLoot(NORMAL_LOOT_TABLES[node.encounter], equipment.ownedIds, healer, random)) equipment.acquire(item.id);
      equipment = regeared(equipment, healer);
    }
  }
  return { route: path.map(n => n.encounter), encounters, bossEntryMana, clears, loadout: equipment.equipped };
}

export function routeSummary(rows) {
  const reached = rows.filter(r => r.encounters.some(e => e.boss));
  const winners = reached.filter(r => r.encounters.at(-1).won);
  const fights = rows.flatMap(r => r.encounters);
  const paths = [...new Set(rows.map(r => r.route.join('/')))];
  return { routeCompletion: reached.length / rows.length, fullCompletion: winners.length / rows.length,
    bossWinWhenReached: reached.length ? winners.length / reached.length : null,
    bossEntryMana: mean(reached, 'bossEntryMana'), ...summary(fights), samples: rows.length,
    routes: paths.map(path => { const subset = rows.filter(r => r.route.join('/') === path); return { path, samples: subset.length,
      fullCompletion: subset.filter(r => r.encounters.at(-1).boss && r.encounters.at(-1).won).length / subset.length }; }),
    encounters: [...new Set(fights.map(f => f.encounter))].map(id => ({ id, ...summary(fights.filter(f => f.encounter === id)) })) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const samples = Number(process.argv[2] || 30), mode = process.argv[3] || 'controlled';
  if (!Number.isInteger(samples) || samples < 1) throw new Error('Positive integer samples required');
  const chapters = (process.env.CHAPTERS || '1,2,3,4').split(',').map(Number);
  const healers = (process.env.HEALERS || 'priest,druid,shaman').split(',');
  const version = process.env.BALANCE_VERSION || 'current', filter = process.env.BUILD_FILTER ? process.env.BUILD_FILTER.split(',') : null;
  for (const chapter of chapters) for (const healer of healers) {
    const points = chapter * 2 - 1;
    const entries = Object.entries(builds[healer]).filter(([name]) => filter ? filter.includes(name) && (mode !== 'routes' || name.startsWith(`${points}-`))
      : mode === 'routes' ? name === defaults[healer][chapter - 1]
      : name.startsWith(`${points}-`) || name === '0-base' || chapter === 4 && name.startsWith('8-'));
    for (const [name, build] of entries) {
      if (mode === 'routes') {
        for (const skill of (process.env.SKILLS || 'veryGood,average,weak').split(',')) for (const stage of (process.env.STAGES || 'first,one,ready').split(',')) {
          const rows = Array.from({ length: samples }, (_, i) => routeTrial(chapter, healer, skill, stage, i, name, version));
          console.log(JSON.stringify({ mode, chapter, healer, build: name, points: validateBuild(healer, build), version, tuning: JSON.parse(process.env.SHAMAN_TUNING || '{}'), skill, stage, ...routeSummary(rows) }));
        }
      } else if (mode === 'controlled' || mode === 'marginal') {
        for (const profile of (process.env.PROFILES || Object.keys(profiles).filter(name => name !== 'groupBurst').join(',')).split(',')) {
          const scale = Number(process.env.PRESSURE_SCALE || 1), encounter = controlledEncounter(chapter, profile, scale);
          const run = allocation => Array.from({ length: samples }, (_, i) => {
            const seed = 87000 + chapter * 10000 + i;
            return simulate(encounter, equivalentParty(chapter, healer, seed), healer, allocation, seed + 999, null,
              { seconds: profile === 'long' ? 140 : 90, version });
          });
          const current = summary(run(build));
          console.log(JSON.stringify({ mode, chapter, healer, build: name, points: validateBuild(healer, build), profile, scale, version, tuning: JSON.parse(process.env.SHAMAN_TUNING || '{}'), ...current }));
          if (mode === 'marginal') for (const talent of TALENT_TREES[healer].filter(t => build[t.id])) {
            const reduced = { ...build }; if (--reduced[talent.id] === 0) delete reduced[talent.id];
            try { validateBuild(healer, reduced); } catch { continue; }
            const without = summary(run(reduced));
            console.log(JSON.stringify({ mode: 'ablation', chapter, healer, build: name, profile, scale, version,
              talent: talent.id, rank: build[talent.id], with: current, without }));
          }
        }
      } else throw new Error(`Unknown mode ${mode}`);
    }
  }
}
