// BAT-91: Shaman-only, real Combat / authored gear / persistent route resources.
// node scripts/encounter-pressure.mjs [samples=8] [before|recovery|after] [output.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Combat } from '../src/combat.js';
import { CONFIG, CHAPTERS, CHAPTER_ENCOUNTERS, HEALERS } from '../src/data.js';
import { shamanTalentLoadout } from '../src/shaman-talents.js';
import { TALENT_TREES } from '../src/talent-trees.js';
import { recoverEncounterMana } from '../src/chapter-runs.js';
import { seeded, routes, recursiveInheritedEquipment, acquireRoute, regeared } from './boss-balance.mjs';
import { rollNormalLoot, NORMAL_LOOT_TABLES } from '../src/loot.js';
import { shamanBuilds } from './shaman-policy.mjs';
import { decideShamanPriority } from './shaman-priority.mjs';

export const baseline = JSON.parse(readFileSync(new URL('./fixtures/bat91-encounters.json', import.meta.url)));
export const chapterBuilds = [['1-reserves', '1-deep'], ['3-waves', '3-tide'],
  ['5-flow', '5-echo', '5-double'], ['7-earth', '7-tide', '7-ancestral-wave', '7-earth-echo']];
const mean = (rows, field) => rows.length ? rows.reduce((s, r) => s + (typeof field === 'function' ? field(r) : r[field]), 0) / rows.length : null;
const mapMean = (rows, field) => Object.fromEntries([...new Set(rows.flatMap(r => Object.keys(r[field])))].map(k => [k, mean(rows, r => r[field][k] || 0)]));

export function pressureFight(encounter, party, build, seed, resources = null, skill = 'veryGood') {
  const loadout = shamanTalentLoadout(party, HEALERS.shaman.combatSpells, build);
  const game = new Combat(encounter, seeded(seed), loadout.party, loadout.spells);
  if (resources) game.reset(encounter, resources);
  const entry = game.resources(), healing = {}, damage = {}, sources = {}, casts = {}, low = {};
  let mana = game.mana, spent = 0, busy = 0, urgent = 0, nearDeaths = 0, nextDecision = 0, dotDamage = 0, peak = 0;
  Object.defineProperty(game, 'mana', { get: () => mana, set: v => { spent += Math.max(0, mana - v); mana = v; } });
  const window = [];
  game.start();
  while (game.status === 'running') {
    if (game.time >= nextDecision) {
      if (skill !== 'late' || game.party.some(p => p.hp > 0 && p.hp / p.maxHp <= .30)) decideShamanPriority(game, skill === 'late' ? 'veryGood' : skill);
      nextDecision = game.time + ({ veryGood: .12, average: .25, weak: .45, late: .25 }[skill] || .12);
    }
    busy += CONFIG.step * Number(!!game.cast);
    urgent += CONFIG.step * Number(game.party.filter(p => p.hp > 0 && p.hp / p.maxHp < .65).length >= 2);
    game.step();
    for (const event of game.drainEvents()) {
      if (event.type === 'heal') healing[event.target] = (healing[event.target] || 0) + event.amount;
      if (event.type === 'cast') casts[event.spell] = (casts[event.spell] || 0) + 1;
      if (event.type === 'damage' && event.target !== 'boss') {
        damage[event.target] = (damage[event.target] || 0) + event.amount;
        sources[event.source] = (sources[event.source] || 0) + event.amount;
        if (event.damageType === 'Bleed') dotDamage += event.amount;
        window.push({ time: event.time, amount: event.amount });
        while (window[0]?.time < event.time - 5) window.shift();
        peak = Math.max(peak, window.reduce((s, e) => s + e.amount, 0) / 5);
      }
    }
    for (const p of game.party) {
      const down = p.hp > 0 && p.hp / p.maxHp <= .30;
      if (down && !low[p.id]) nearDeaths++;
      low[p.id] = down;
    }
  }
  const totalHealing = game.stats.effective, totalDamage = Object.values(damage).reduce((a, b) => a + b, 0);
  return { won: game.status === 'victory', seconds: game.time, healingRequired: totalDamage, effectiveHealing: totalHealing,
    pressureHps: totalDamage / game.time, peak5sHps: peak, manaSpent: spent, entryMana: entry.mana.current,
    exitMana: game.mana, maxMana: game.maxMana, deaths: game.stats.deaths, nearDeaths,
    tankShare: totalHealing ? (healing.tank || 0) / totalHealing : 0, nonTankShare: totalHealing ? 1 - (healing.tank || 0) / totalHealing : 0,
    dotDamage, dotShare: totalDamage ? dotDamage / totalDamage : 0, busyShare: busy / game.time, triageSeconds: urgent,
    healingByMember: healing, damageByMember: damage, damageBySource: sources, casts,
    resources: game.resources(), entryResources: entry, party: loadout.party };
}

export function pressureRoute(chapterNumber, pathIndex, index, buildName, stage, skill, scenario = 'after', recoveryOverride) {
  const seed = 910000 + chapterNumber * 10000 + index, random = seeded(seed);
  const chapter = CHAPTERS[chapterNumber - 1], path = routes(chapter)[pathIndex];
  const boss = chapter.nodes.find(n => n.kind === 'boss');
  // Gear acquisition uses the shipped post-BAT-92 catalogue. Skill changes never
  // alter gear in paired comparisons; extra readiness gear is an explicit stage.
  let equipment = recursiveInheritedEquipment(chapterNumber - 1, 'shaman', 'veryGood', seed, random).equipment;
  const clears = stage === 'first' ? 0 : stage === 'one' ? 1 : 3;
  for (let i = 0; i < clears; i++) {
    acquireRoute(chapter, routes(chapter)[i % routes(chapter).length], equipment, 'shaman', random);
    equipment = regeared(equipment, 'shaman');
  }
  const build = shamanBuilds[buildName], prior = { ...build };
  const last = [...TALENT_TREES.shaman].reverse().find(t => prior[t.id]);
  if (last && --prior[last.id] === 0) delete prior[last.id];
  const encounters = [];
  let resources = null, bossEntryMana = null;
  for (const [position, node] of [...path, boss].entries()) {
    const encounter = (scenario === 'after' ? CHAPTER_ENCOUNTERS : baseline)[node.encounter];
    const result = pressureFight(encounter, equipment.party('shaman'), stage === 'first' && position === 0 ? prior : build,
      Math.floor(random() * 2 ** 32), resources, skill);
    if (node === boss) bossEntryMana = result.entryMana;
    const fraction = recoveryOverride ?? (scenario === 'before' ? 0 : CONFIG.encounterManaRecovery);
    resources = result.won && node !== boss ? recoverEncounterMana(result.resources, fraction) : result.resources;
    const recovered = resources.mana.current - result.exitMana;
    encounters.push({ encounter: node.encounter, boss: node === boss, ...result, equipped: structuredClone(equipment.equipped), manaRecovered: recovered,
      netManaLoss: result.entryMana - resources.mana.current });
    if (!result.won) break;
    if (node !== boss) {
      for (const item of rollNormalLoot(NORMAL_LOOT_TABLES[node.encounter], equipment.ownedIds, 'shaman', random)) equipment.acquire(item.id);
      equipment = regeared(equipment, 'shaman');
    }
  }
  return { chapter: chapterNumber, path: path.map(n => n.encounter), build: buildName, stage, skill, scenario, seed,
    bossEntryMana, won: encounters.at(-1)?.boss && encounters.at(-1).won, encounters };
}

export function pressureSummary(rows) {
  const keys = ['seconds', 'healingRequired', 'effectiveHealing', 'pressureHps', 'peak5sHps', 'manaSpent', 'entryMana',
    'exitMana', 'maxMana', 'manaRecovered', 'netManaLoss', 'deaths', 'nearDeaths', 'tankShare', 'nonTankShare', 'dotDamage', 'dotShare', 'busyShare', 'triageSeconds'];
  const aggregate = encounters => ({ samples: encounters.length, completion: mean(encounters, r => Number(r.won)),
    victorySeconds: mean(encounters.filter(e => e.won), 'seconds'),
    ...Object.fromEntries(keys.map(k => [k, mean(encounters, k)])),
    healingByMember: mapMean(encounters, 'healingByMember'), damageByMember: mapMean(encounters, 'damageByMember'),
    damageBySource: mapMean(encounters, 'damageBySource'), casts: mapMean(encounters, 'casts') });
  const encounters = rows.flatMap(r => r.encounters), ids = [...new Set(encounters.map(e => e.encounter))];
  return { samples: rows.length, completion: mean(rows, r => Number(r.won)),
    bossEntryMana: mean(rows.filter(r => r.bossEntryMana !== null), 'bossEntryMana'),
    routeDeaths: mean(rows, r => r.encounters.reduce((s, e) => s + e.deaths, 0)),
    encounters: Object.fromEntries(ids.map(id => [id, aggregate(encounters.filter(e => e.encounter === id))])) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const samples = Number(process.argv[2] || 8), scenario = process.argv[3] || 'after';
  if (!Number.isInteger(samples) || samples < 1 || !['before', 'recovery', 'after'].includes(scenario)) throw new Error('Invalid arguments');
  const list = (key, fallback) => (process.env[key] || fallback).split(',');
  const report = { scenario, samples, healer: 'shaman', gear: 'post-BAT-92', recovery: scenario === 'before' ? 0 : Number(process.env.RECOVERY ?? CONFIG.encounterManaRecovery), groups: [] };
  for (const chapter of list('CHAPTERS', '1,2,3,4').map(Number)) for (const path of routes(CHAPTERS[chapter - 1]).keys())
    for (const build of list('BUILDS', chapterBuilds[chapter - 1].join(','))) for (const stage of list('STAGES', 'first,ready'))
      for (const skill of list('SKILLS', 'veryGood,average,weak')) {
        const rows = Array.from({ length: samples }, (_, i) => pressureRoute(chapter, path, i, build, stage, skill, scenario, report.recovery));
        report.groups.push({ chapter, path, build, stage, skill, ...pressureSummary(rows) });
      }
  if (process.argv[4]) writeFileSync(process.argv[4], JSON.stringify(report, null, 2) + '\n');
  const summaryStage = report.groups.some(g => g.stage === 'ready') ? 'ready' : report.groups[0]?.stage;
  const summarySkill = report.groups.some(g => g.skill === 'veryGood') ? 'veryGood' : report.groups[0]?.skill;
  console.log(JSON.stringify({ scenario, samples, groups: report.groups.length, stage: summaryStage, skill: summarySkill,
    chapters: [...new Set(report.groups.map(g => g.chapter))].map(chapter => {
    const groups = report.groups.filter(g => g.chapter === chapter && g.stage === summaryStage && g.skill === summarySkill);
    const enc = groups.flatMap(g => Object.entries(g.encounters).map(([id, e]) => ({ id, ...e })));
    return { chapter, completion: mean(groups, 'completion'), bossEntryMana: mean(groups, 'bossEntryMana'),
      encounters: Object.fromEntries([...new Set(enc.map(e => e.id))].map(id => [id, Object.fromEntries(['seconds', 'pressureHps', 'manaSpent', 'netManaLoss', 'tankShare', 'nearDeaths', 'busyShare'].map(k => [k, mean(enc.filter(e => e.id === id), k)]))])) };
  }) }));
}
