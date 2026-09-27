// BAT-94: paired Chapter 4 pressure probes and persistent Shaman routes.
// node scripts/chapter4-pressure.mjs [before|after] [samples=8] [output.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Combat } from '../src/combat.js';
import { CONFIG, CHAPTERS, CHAPTER_ENCOUNTERS, GEAR, HEALERS } from '../src/data.js';
import { fullResources, recoverEncounterMana } from '../src/chapter-runs.js';
import { shamanTalentLoadout } from '../src/shaman-talents.js';
import { TALENT_TREES } from '../src/talent-trees.js';
import { seeded, routes, recursiveInheritedEquipment, acquireRoute, regeared } from './boss-balance.mjs';
import { NORMAL_LOOT_TABLES, rollNormalLoot } from '../src/loot.js';
import { shamanBuilds } from './shaman-policy.mjs';
import { decideShamanPriority, expectedDamage, pendingHealing } from './shaman-priority.mjs';
import { chapterBuilds } from './encounter-pressure.mjs';
import { baseline as manaBaseline } from './mana-economy.mjs';

export const baseline = JSON.parse(readFileSync(new URL('./fixtures/bat94-pressure.json', import.meta.url)));
const mean = (rows, fn) => rows.length ? rows.reduce((sum, row) => sum + fn(row), 0) / rows.length : null;
export function fight(encounter, party, build, seed, resources, policy = 'conservative') {
  const loadout = shamanTalentLoadout(party, HEALERS.shaman.combatSpells, build);
  const game = new Combat(encounter, seeded(seed), loadout.party, loadout.spells);
  if (resources) game.reset(encounter, resources);
  const entryResources = game.resources();
  let mana = game.mana, spent = 0, regen = 0, next = 0, nearDeaths = 0, oomSeconds = 0, damage = 0, bleedDamage = 0, triageSeconds = 0;
  const low = {}, healingByMember = {}, damageByMember = {};
  Object.defineProperty(game, 'mana', { get: () => mana, set: value => {
    spent += Math.max(0, mana - value); regen += Math.max(0, value - mana); mana = value;
  } });
  game.start();
  while (game.status === 'running') {
    if (game.time >= next) {
      if (policy === 'oneHot' && game.stats.casts === 0) game.begin('riptide', 'tank');
      if (policy === 'oneWave' && game.stats.casts === 0 && !game.cast && game.party[0].hp < game.party[0].maxHp * .65) game.begin('healingWave', 'tank');
      if (['conservative', 'wasteful'].includes(policy)) {
        if (game.party.some(p => p.hp > 0 && (p.hp / p.maxHp < .45
          || (p.hp - expectedDamage(game, p, 3) + pendingHealing(game, p, 3)) / p.maxHp < .65))) decideShamanPriority(game);
        if (policy === 'wasteful' && !game.cast) {
          const target = game.party.filter(p => p.hp > 0).sort((a,b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
          if (target) game.begin('healingWave', target.id);
        }
      }
      next = game.time + .12;
    }
    if (game.mana < Math.min(...game.spells.map(s => game.manaCost(s)))) oomSeconds += CONFIG.step;
    triageSeconds += CONFIG.step * Number(game.party.filter(p => p.hp > 0 && p.hp / p.maxHp < .65).length >= 2);
    game.step();
    for (const event of game.drainEvents()) {
      if (event.type === 'damage' && event.target !== 'boss') {
        damage += event.amount; if (event.damageType === 'Bleed') bleedDamage += event.amount;
        damageByMember[event.target] = (damageByMember[event.target] || 0) + event.amount;
      }
      if (event.type === 'heal') healingByMember[event.target] = (healingByMember[event.target] || 0) + event.amount;
    }
    for (const p of game.party) {
      const down = p.hp > 0 && p.hp / p.maxHp <= .30;
      if (down && !low[p.id]) nearDeaths++;
      low[p.id] = down;
    }
  }
  return { won: game.status === 'victory', seconds: game.time, entryMana: entryResources.mana.current,
    maxMana: game.maxMana, manaSpent: spent, manaRegenerated: regen, exitMana: mana,
    casts: game.stats.casts, effectiveHealing: game.stats.effective, overhealing: game.stats.overheal,
    deaths: game.stats.deaths, nearDeaths, oomSeconds, damage, bleedDamage, triageSeconds,
    healingByMember, damageByMember, resources: game.resources(), entryResources };
}

// Freeze BAT-93 gear scoring, then restore its selected 1.5x Regen on the party.
// Acquisition models real seeded rewards; it assumes wins when preparing gear.
export function states(pathIndex, index, buildName, stage) {
  const regen = GEAR.map(item => item.stats.manaRegen);
  try {
    for (const item of GEAR) if (item.stats.manaRegen != null) item.stats.manaRegen = manaBaseline.itemRegen[item.id];
    return acquiredStates(pathIndex,index,buildName,stage);
  } finally {
    GEAR.forEach((item,index) => { if (regen[index] != null) item.stats.manaRegen = regen[index]; });
  }
}
function acquiredStates(pathIndex, index, buildName, stage) {
  const seed = 950000 + index, random = seeded(seed), chapter = CHAPTERS[3];
  let equipment = recursiveInheritedEquipment(3, 'shaman', 'veryGood', seed, random).equipment;
  for (let i = 0; i < (stage === 'first' ? 0 : 3); i++) {
    acquireRoute(chapter, routes(chapter)[i % routes(chapter).length], equipment, 'shaman', random);
    equipment = regeared(equipment, 'shaman');
  }
  return [...routes(chapter)[pathIndex], chapter.nodes.find(n => n.kind === 'boss')].map((node, position) => {
    const party = equipment.party('shaman').map(({ spellBook, combatSpells, description, ...p }) => p.label !== 'HEALER' ? p : { ...p,
      manaRegen: 3 + 1.5 * Object.values(equipment.equipped.shaman || {}).reduce((sum,id) => sum + (manaBaseline.itemRegen[id] || 0), 0) });
    const build = { ...shamanBuilds[buildName] };
    if (stage === 'first' && position === 0) {
      const last = [...TALENT_TREES.shaman].reverse().find(t => build[t.id]);
      if (last && --build[last.id] === 0) delete build[last.id];
    }
    const state = { encounter: node.encounter, boss: node.kind === 'boss', party, allocations: build,
      combatSeed: seed + position * 100000, equipped: structuredClone(equipment.equipped) };
    if (node.kind !== 'boss') {
      for (const item of rollNormalLoot(NORMAL_LOOT_TABLES[node.encounter], equipment.ownedIds, 'shaman', random)) equipment.acquire(item.id);
      equipment = regeared(equipment, 'shaman');
    }
    return state;
  });
}

export function summarize(rows) {
  return { attempts: rows.length, safeClears: rows.filter(r => r.won && !r.deaths).length,
    completion: mean(rows,r => +r.won), casts: mean(rows,r => r.casts), seconds: mean(rows,r => r.seconds),
    effectiveHealing: mean(rows,r => r.effectiveHealing), manaSpent: mean(rows,r => r.manaSpent),
    manaRegenerated: mean(rows,r => r.manaRegenerated), netManaCost: mean(rows,r => r.netManaCost),
    deaths: mean(rows,r => r.deaths), nearDeaths: mean(rows,r => r.nearDeaths),
    bleedShare: rows.reduce((s,r) => s + r.bleedDamage,0) / rows.reduce((s,r) => s + r.damage,0),
    triageSeconds: mean(rows,r => r.triageSeconds) };
}
export function evaluate(samples = 8) {
  const probes = [], routeRows = [];
  for (const path of routes(CHAPTERS[3]).keys()) for (const build of chapterBuilds[3])
    for (const stage of ['first','ready']) for (let index = 0; index < samples; index++) {
      const loadouts = states(path,index,build,stage), context = { path, build, stage, seed: 950000 + index };
      for (const state of loadouts.filter(s => !s.boss)) for (const policy of ['idle','oneHot','oneWave','conservative']) {
        const resources = fullResources(state.party); resources.mana.current /= 2;
        const result = fight(CHAPTER_ENCOUNTERS[state.encounter],state.party,state.allocations,state.combatSeed,resources,policy);
        const ending = result.won ? recoverEncounterMana(result.resources,.2).mana.current : result.exitMana;
        probes.push({ ...context, ...state, policy, ...result, endingMana: ending, netManaCost: result.entryMana - ending });
      }
      for (const policy of ['conservative','wasteful','mistake']) {
        const encounters = []; let resources = null;
        for (const [position,state] of loadouts.entries()) {
          const result = fight(CHAPTER_ENCOUNTERS[state.encounter],state.party,state.allocations,state.combatSeed,resources,
            policy === 'mistake' ? (position === 0 ? 'wasteful' : 'conservative') : policy);
          resources = result.won && !state.boss ? recoverEncounterMana(result.resources,.2) : result.resources;
          encounters.push({ ...state, ...result, endingMana: resources.mana.current, netManaCost: result.entryMana - resources.mana.current });
          if (!result.won) break;
        }
        routeRows.push({ ...context, policy, won: !!encounters.at(-1)?.boss && encounters.at(-1).won,
          normalsCleared: encounters.filter(e => !e.boss && e.won).length === loadouts.length - 1,
          bossEntryMana: encounters.find(e => e.boss)?.entryMana ?? null, encounters });
      }
    }
  const probeSummary = [], routeSummary = [];
  for (const stage of ['first','ready']) {
    for (const policy of ['idle','oneHot','oneWave','conservative']) for (const encounter of [...new Set(probes.map(p => p.encounter))])
      probeSummary.push({ stage,policy,encounter,...summarize(probes.filter(p => p.stage === stage && p.policy === policy && p.encounter === encounter)) });
    for (const policy of ['conservative','wasteful','mistake']) {
      const rows = routeRows.filter(r => r.stage === stage && r.policy === policy), bosses = rows.filter(r => r.bossEntryMana !== null);
      routeSummary.push({ stage,policy,attempts:rows.length,completion:mean(rows,r=>+r.won),normalCompletion:mean(rows,r=>+r.normalsCleared),
        bossEntryMana:mean(bosses,r=>r.bossEntryMana),deaths:mean(rows,r=>r.encounters.reduce((s,e)=>s+e.deaths,0)),
        normalOom:mean(rows,r=>+r.encounters.some(e=>!e.boss && e.oomSeconds>1)) });
    }
  }
  return { samples, tuning: { recovery:.2,baseRegen:3,gearScale:1.5 }, probeSummary, routeSummary, probes, routes:routeRows };
}
// Store shared gear/party states once. Health snapshots retain actual carried
// values; maximums and equipped IDs can be joined through the loadout index.
export function packReport(report) {
  const loadouts = [], indices = new Map();
  const pack = ({ party, equipped, allocations, resources, entryResources, ...row }) => {
    const state = { party, equipped, allocations }, key = JSON.stringify(state);
    if (!indices.has(key)) { indices.set(key,loadouts.length); loadouts.push(state); }
    return { ...row, loadout:indices.get(key),
      entryHealth:Object.fromEntries(Object.entries(entryResources.health).map(([id,p])=>[id,p.current])),
      exitHealth:Object.fromEntries(Object.entries(resources.health).map(([id,p])=>[id,p.current])) };
  };
  return { schemaVersion:1, ...report, loadouts, probes:report.probes.map(pack),
    routes:report.routes.map(r=>({...r,encounters:r.encounters.map(pack)})) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const scenario = process.argv[2] || 'after', samples = Number(process.argv[3] || 8);
  if (!['before','after'].includes(scenario) || !Number.isInteger(samples) || samples < 1) throw new Error('Invalid arguments');
  if (scenario === 'before') Object.assign(CHAPTER_ENCOUNTERS,structuredClone(baseline.encounters));
  const report = { scenario, ...evaluate(samples) };
  writeFileSync(process.argv[4] || `docs/bat-94-${scenario}.json`,JSON.stringify(packReport(report))+'\n');
  console.log(JSON.stringify({ scenario,probeSummary:report.probeSummary,routeSummary:report.routeSummary }));
}
