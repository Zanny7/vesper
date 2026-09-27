// BAT-93: only recovery, base Regen and item Regen vary. No production mutations.
// node scripts/mana-economy.mjs [screen|final|gear] [samples] [output.json]
import { writeFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Combat } from '../src/combat.js';
import { CONFIG, CHAPTERS, CHAPTER_ENCOUNTERS, HEALERS } from '../src/data.js';
import { shamanTalentLoadout } from '../src/shaman-talents.js';
import { TALENT_TREES } from '../src/talent-trees.js';
import { recoverEncounterMana } from '../src/chapter-runs.js';
import { seeded, routes, recursiveInheritedEquipment, acquireRoute, regeared } from './boss-balance.mjs';
import { rollNormalLoot, NORMAL_LOOT_TABLES } from '../src/loot.js';
import { shamanBuilds } from './shaman-policy.mjs';
import { decideShamanPriority, expectedDamage, pendingHealing } from './shaman-priority.mjs';
import { chapterBuilds } from './encounter-pressure.mjs';

// This fixture records the pre-BAT-93 catalogue so results remain reproducible
// after shipping the chosen scaling. Gear selection uses its original score.
export const baseline = JSON.parse(readFileSync(new URL('./fixtures/bat93-mana.json', import.meta.url)));
export const combinations = [0, .1, .2].flatMap(recovery => [2, 2.5, 3].flatMap(baseRegen =>
  [1, 1.25, 1.5].map(gearScale => ({ recovery, baseRegen, gearScale }))));
const mean = (rows, fn) => rows.length ? rows.reduce((sum, row) => sum + fn(row), 0) / rows.length : null;

export function manaFight(encounter, party, build, seed, resources, policy) {
  const loadout = shamanTalentLoadout(party, HEALERS.shaman.combatSpells, build);
  const game = new Combat(encounter, seeded(seed), loadout.party, loadout.spells);
  if (resources) game.reset(encounter, resources);
  const entry = game.mana;
  let mana = game.mana, spent = 0, regenerated = 0, next = 0, oomSeconds = 0;
  Object.defineProperty(game, 'mana', { get: () => mana, set: v => {
    spent += Math.max(0, mana - v); regenerated += Math.max(0, v - mana); mana = v;
  } });
  game.start();
  while (game.status === 'running') {
    if (game.time >= next) {
      const conserve = policy.startsWith('conservative');
      const needsResponse = policy !== 'idle' && (!conserve || game.party.some(p => p.hp > 0 && (p.hp / p.maxHp < .45
        || (p.hp - expectedDamage(game, p, 3) + pendingHealing(game, p, 3)) / p.maxHp < .65)));
      if (needsResponse) decideShamanPriority(game);
      // Controlled inefficiency: spend spare cast time on Wave, even into full
      // Health. Same reaction cadence and useful policy; no slower combat clock.
      if (['wasteful', 'conservativeWasteful'].includes(policy) && !game.cast) {
        const target = game.party.filter(p => p.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (target) game.begin('healingWave', target.id);
      }
      next = game.time + .12;
    }
    if (game.mana < Math.min(...game.spells.map(s => game.manaCost(s)))) oomSeconds += CONFIG.step;
    game.step(); game.drainEvents();
  }
  return { won: game.status === 'victory', seconds: game.time, entryMana: entry, maxMana: game.maxMana,
    manaSpent: spent, manaRegenerated: regenerated, exitMana: game.mana, oomSeconds,
    effectiveHealing: game.stats.effective, overhealing: game.stats.overheal, casts: game.stats.casts, deaths: game.stats.deaths,
    regenPerSecond: loadout.party.find(p => p.label === 'HEALER').manaRegen, resources: game.resources() };
}

export function manaRoute(chapterNumber, pathIndex, index, buildName, stage, policy, tuning) {
  const seed = 910000 + chapterNumber * 10000 + index, random = seeded(seed);
  const chapter = CHAPTERS[chapterNumber - 1], path = routes(chapter)[pathIndex];
  const boss = chapter.nodes.find(n => n.kind === 'boss');
  let equipment = recursiveInheritedEquipment(chapterNumber - 1, 'shaman', 'veryGood', seed, random).equipment;
  for (let i = 0; i < (stage === 'first' ? 0 : 3); i++) {
    acquireRoute(chapter, routes(chapter)[i % routes(chapter).length], equipment, 'shaman', random);
    equipment = regeared(equipment, 'shaman');
  }
  const build = shamanBuilds[buildName], prior = { ...build };
  const last = [...TALENT_TREES.shaman].reverse().find(t => prior[t.id]);
  if (last && --prior[last.id] === 0) delete prior[last.id];
  const encounters = [];
  let resources = null, bossEntryMana = null;
  for (const [position, node] of [...path, boss].entries()) {
    const gearRegen = Object.values(equipment.equipped.shaman || {}).reduce((sum, id) => sum + (baseline.itemRegen[id] || 0), 0);
    const party = equipment.party('shaman').map(p => p.label === 'HEALER'
      ? { ...p, manaRegen: tuning.baseRegen + gearRegen * tuning.gearScale } : p);
    const encounterPolicy = policy === 'oneMistake' ? (position === 0 ? 'wasteful' : 'efficient')
      : policy === 'conservativeMistake' ? (position === 0 ? 'conservativeWasteful' : 'conservative') : policy;
    const result = manaFight(CHAPTER_ENCOUNTERS[node.encounter], party, stage === 'first' && position === 0 ? prior : build,
      seed + position * 100000, resources, encounterPolicy);
    if (node === boss) bossEntryMana = result.entryMana;
    resources = result.won && node !== boss ? recoverEncounterMana(result.resources, tuning.recovery) : result.resources;
    const { resources: snapshot, ...metrics } = result;
    encounters.push({ encounter: node.encounter, boss: node === boss, ...metrics, gearRegen: gearRegen * tuning.gearScale,
      equipped: structuredClone(equipment.equipped), entryParty: party, resources: snapshot,
      manaRecovered: resources.mana.current - result.exitMana, endingMana: resources.mana.current,
      netManaCost: result.entryMana - resources.mana.current });
    if (!result.won) break;
    if (node !== boss) {
      for (const item of rollNormalLoot(NORMAL_LOOT_TABLES[node.encounter], equipment.ownedIds, 'shaman', random)) equipment.acquire(item.id);
      equipment = regeared(equipment, 'shaman');
    }
  }
  return { chapter: chapterNumber, path: pathIndex, seed, build: buildName, stage, policy, bossEntryMana,
    won: !!encounters.at(-1)?.boss && encounters.at(-1).won, encounters };
}

export function summarize(rows) {
  const encounters = rows.flatMap(r => r.encounters), normals = encounters.filter(e => !e.boss && e.won);
  return { attempts: rows.length, completion: mean(rows, r => Number(r.won)),
    normalCompletion: mean(rows, r => Number(r.encounters.filter(e => !e.boss && e.won).length === CHAPTERS[r.chapter - 1].routeLength - 1)),
    bossEntryMana: mean(rows.filter(r => r.bossEntryMana !== null), r => r.bossEntryMana),
    oomRate: mean(rows, r => Number(r.encounters.some(e => e.oomSeconds > 1))),
    normalOomRate: mean(rows, r => Number(r.encounters.some(e => !e.boss && e.oomSeconds > 1))),
    netNormalCost: mean(normals, e => e.netManaCost), gainingNormals: mean(normals, e => Number(e.netManaCost < -1)),
    encounterSeconds: mean(encounters, e => e.seconds), deaths: mean(rows, r => r.encounters.reduce((s, e) => s + e.deaths, 0)) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] || 'screen', samples = Number(process.argv[3] || 2);
  if (!['screen', 'final', 'gear'].includes(mode) || !Number.isInteger(samples) || samples < 1) throw new Error('Invalid arguments');
  // Normalize only in this analysis process; production exports are unchanged.
  // itemScore must be identical between candidates, including after shipping.
  const { GEAR } = await import('../src/data.js');
  for (const item of GEAR) if (item.stats.manaRegen != null) item.stats.manaRegen = baseline.itemRegen[item.id];
  const candidates = mode === 'screen' ? combinations : mode === 'gear'
    ? [1, 1.25, 1.5].map(gearScale => ({ recovery: .2, baseRegen: 3, gearScale }))
    : JSON.parse(process.env.CANDIDATES || '[{"recovery":0.2,"baseRegen":3,"gearScale":1.5},{"recovery":0.1,"baseRegen":3,"gearScale":1.5}]');
  if (candidates.some(t => !combinations.some(c => c.recovery === t.recovery && c.baseRegen === t.baseRegen && c.gearScale === t.gearScale))) throw new Error('Unapproved tuning');
  const policies = process.env.POLICIES?.split(',') || (mode === 'final'
    ? ['conservative', 'conservativeWasteful', 'conservativeMistake'] : ['conservative']);
  if (policies.some(p => !['efficient', 'wasteful', 'oneMistake', 'conservative', 'conservativeWasteful', 'conservativeMistake'].includes(p))) throw new Error('Invalid player policy');
  const report = { healer: 'shaman', mode, samples, seedFormula: '910000 + chapter * 10000 + index', groups: [], representatives: [] };
  for (const tuning of candidates) {
    const rows = [];
    for (let chapter = 1; chapter <= 4; chapter++) for (const path of routes(CHAPTERS[chapter - 1]).keys())
      for (const build of (mode === 'screen' ? [chapterBuilds[chapter - 1][0]] : chapterBuilds[chapter - 1]))
        for (const stage of (mode === 'gear' ? ['ready'] : ['first', 'ready'])) for (const policy of policies) {
          const group = Array.from({ length: samples }, (_, i) => manaRoute(chapter, path, i, build, stage, policy, tuning));
          report.groups.push({ tuning, chapter, path, build, stage, policy, ...summarize(group) });
          rows.push(...group);
          if (mode === 'final' && path === 0 && build === chapterBuilds[chapter - 1][0]) report.representatives.push(...group.slice(0, 2).map(r => ({ tuning, ...r })));
        }
    const summary = [1, 2, 3, 4].map(chapter => ({ chapter, ...summarize(rows.filter(r => r.chapter === chapter && r.stage === 'ready' && r.policy === policies[0])) }));
    console.log(JSON.stringify({ tuning, summary }));
  }
  writeFileSync(process.argv[4] || `docs/bat-93-${mode}.json`, JSON.stringify(report, null, 2) + '\n');
}
