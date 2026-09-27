// BAT-97 content probes using only actual catalogue gear. No stat multipliers.
// node scripts/era2-content.mjs [samples=4] [output=docs/bat-97-probes.json]
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Combat } from '../src/combat.js';
import { CONFIG, CHAPTERS, CHAPTER_ENCOUNTERS, GEAR, HEALERS } from '../src/data.js';
import { applyNodeUtility, fullResources, recoverEncounterMana } from '../src/chapter-runs.js';
import { shamanTalentLoadout } from '../src/shaman-talents.js';
import { shamanBuilds } from './shaman-policy.mjs';
import { decideShamanPriority, expectedDamage, pendingHealing } from './shaman-priority.mjs';
import { seeded, routes, recursiveInheritedEquipment, acquireRoute, regeared } from './boss-balance.mjs';

export const builds = ['8-earth', '8-ancestral', '8-tide'];
export function priorEquipment(stage, seed) {
  const random = seeded(seed);
  let equipment = recursiveInheritedEquipment(4, 'shaman', 'veryGood', seed, random).equipment;
  if (stage === 'prior-farmed') for (let i = 0; i < 4; i++) {
    acquireRoute(CHAPTERS[3], routes(CHAPTERS[3])[i % 4], equipment, 'shaman', random);
    equipment = regeared(equipment, 'shaman');
  }
  if (stage === 'prior-catalogue') {
    for (const item of GEAR.filter(item => item.chapter <= 4)) equipment.acquire(item.id);
    equipment = regeared(equipment, 'shaman');
  }
  return equipment;
}
export function probe(encounter, party, build, seed, resources = fullResources(party), policy = 'conservative') {
  const loadout = shamanTalentLoadout(party, HEALERS.shaman.combatSpells, shamanBuilds[build]);
  const game = new Combat(encounter, seeded(seed), loadout.party, loadout.spells);
  game.reset(encounter, resources);
  const entryMana = game.mana;
  let spent = 0, regenerated = 0, nearDeaths = 0, triageSeconds = 0, bleedDamage = 0, damage = 0, nextDecision = 0;
  let mana = game.mana;
  Object.defineProperty(game, 'mana', { get: () => mana, set: value => {
    spent += Math.max(0, mana - value); regenerated += Math.max(0, value - mana); mana = value;
  } });
  const damageByMember = {}, low = {}, phases = [];
  game.start();
  while (game.status === 'running') {
    if (game.time >= nextDecision) {
    if (policy === 'oneHot' && !game.stats.casts) game.begin('riptide', 'tank');
    if (policy === 'oneWave' && !game.stats.casts && game.party[0].hp < game.party[0].maxHp * .65) game.begin('healingWave', 'tank');
    if (policy === 'oneStream' && !game.stats.casts && game.party[0].hp < game.party[0].maxHp * .65) game.begin('healingStream', game.healer.id);
    if (['conservative', 'average', 'wasteful'].includes(policy) && !game.cast) {
      if (game.party.some(p => p.hp > 0 && (p.hp / p.maxHp < .45
        || (p.hp - expectedDamage(game, p, 3) + pendingHealing(game, p, 3)) / p.maxHp < .65))) decideShamanPriority(game);
      if (policy === 'wasteful' && !game.cast) {
        const target = game.party.filter(p => p.hp > 0).sort((a,b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (target) game.begin('healingWave', target.id);
      }
    }
      nextDecision = game.time + (policy === 'average' ? .7 : .12);
    }
    triageSeconds += CONFIG.step * Number(game.party.filter(p => p.hp > 0 && p.hp / p.maxHp < .65).length >= 2);
    game.step();
    for (const event of game.drainEvents()) {
      if (event.type === 'phase') phases.push({ name: event.name, at: event.time });
      if (event.type === 'damage' && event.target !== 'boss') {
        damage += event.amount; if (event.damageType === 'Bleed') bleedDamage += event.amount;
        damageByMember[event.target] = (damageByMember[event.target] || 0) + event.amount;
      }
    }
    for (const p of game.party) {
      const down = p.hp > 0 && p.hp / p.maxHp <= .30;
      if (down && !low[p.id]) nearDeaths++;
      low[p.id] = down;
    }
  }
  return { won: game.status === 'victory', safe: game.status === 'victory' && !game.stats.deaths,
    seconds: game.time, entryMana, maxMana: game.maxMana, manaSpent: spent, manaRegenerated: regenerated,
    exitMana: game.mana, effectiveHealing: game.stats.effective, overhealing: game.stats.overheal,
    casts: game.stats.casts, deaths: game.stats.deaths, nearDeaths, triageSeconds, damage, bleedDamage, damageByMember, phases,
    resources: game.resources() };
}
export function probeRoute(chapter, path, party, build, seed, policy) {
  let resources = fullResources(party);
  const encounters = [];
  for (const [position, node] of [...path, chapter.nodes.at(-1)].entries()) {
    if (!node.encounter) {
      const before = structuredClone(resources);
      resources = applyNodeUtility(resources, node.utility);
      encounters.push({ node: node.id, utility: node.utility, before, after: structuredClone(resources) });
      continue;
    }
    const entryHealth = structuredClone(resources.health);
    const { resources: exit, ...result } = probe(CHAPTER_ENCOUNTERS[node.encounter], party, build, seed + position * 1000, resources, policy);
    resources = result.won && node.kind !== 'boss' ? recoverEncounterMana(exit) : exit;
    encounters.push({ node: node.id, kind: node.kind, ...result, recovery: resources.mana.current - result.exitMana,
      netManaMovement: resources.mana.current - result.entryMana, entryHealth,
      exitHealth: structuredClone(resources.health) });
    if (!result.won) break;
  }
  return { won: encounters.at(-1)?.kind === 'boss' && encounters.at(-1).won, safe: encounters.at(-1)?.kind === 'boss' && encounters.at(-1).won && encounters.every(row => !row.deaths),
    bossEntryMana: encounters.find(row => row.kind === 'boss')?.entryMana ?? null, encounters };
}
export function evaluate(samples = 4) {
  const loadouts = [], probes = [], routeRows = [];
  for (const stage of ['prior-entry', 'prior-farmed', 'prior-catalogue']) for (let index = 0; index < samples; index++) {
    const seed = 970000 + index, equipment = priorEquipment(stage, seed), party = equipment.party('shaman');
    const loadout = loadouts.length;
    loadouts.push({ stage, seed, equipped: equipment.equipped, party });
    for (const chapter of CHAPTERS.slice(4)) for (const build of builds) {
      const context = { chapter: chapter.ordinal, stage, seed, build, loadout };
      for (const node of chapter.nodes.filter(node => node.encounter)) for (const policy of ['idle','oneHot','oneWave','oneStream','conservative']) {
        const entry = fullResources(party);
        // Passive probes start full. Active isolated probes also test partial Mana.
        if (policy === 'conservative') entry.mana.current *= .5;
        const { resources, ...result } = probe(CHAPTER_ENCOUNTERS[node.encounter],party,build,seed,entry,policy);
        const ending = result.won && node.kind !== 'boss' ? recoverEncounterMana(resources).mana.current : result.exitMana;
        probes.push({ ...context, node:node.id,kind:node.kind,policy,...result,recovery:ending-result.exitMana,netManaMovement:ending-result.entryMana });
      }
      for (const [pathIndex, path] of routes(chapter).entries()) for (const policy of ['conservative','wasteful']) {
        routeRows.push({ ...context,pathIndex,path:path.map(node=>node.id),policy,...probeRoute(chapter,path,party,build,seed,policy) });
      }
    }
  }
  const mean = (rows,key) => rows.length ? rows.reduce((sum,r)=>sum+r[key],0)/rows.length : null;
  const chapters = CHAPTERS.slice(4).map(chapter => {
    const rows = probes.filter(r=>r.chapter===chapter.ordinal), paths=routeRows.filter(r=>r.chapter===chapter.ordinal);
    return { chapter:chapter.ordinal, nodes:chapter.nodes.length, routes:routes(chapter).length,
      missingGear:!GEAR.some(item=>item.chapter===chapter.ordinal),
      passiveSafeClears:rows.filter(r=>r.policy!=='conservative'&&r.safe).length,
      entry:rows.filter(r=>r.node===chapter.nodes[0].id&&r.policy==='conservative').map(({stage,build,won,safe,seconds,casts})=>({stage,build,won,safe,seconds,casts})),
      routeSummary:['prior-entry','prior-farmed','prior-catalogue'].flatMap(stage=>['conservative','wasteful'].map(policy=> {
        const selected=paths.filter(r=>r.stage===stage&&r.policy===policy), reached=selected.filter(r=>r.bossEntryMana!==null);
        return {stage,policy,attempts:selected.length,wins:selected.filter(r=>r.won).length,safe:selected.filter(r=>r.safe).length,
          bossReached:reached.length,bossEntryMana:mean(reached,'bossEntryMana')};
      })) };
  });
  return { schemaVersion:1,samples,referenceHealer:'shaman',finalBalanceAcceptance:'pending: BAT-97 must validate actual Era II progression using scripts/era2-gear.mjs',
    unavailableStates:[],
    note:'Prior gear acquisition assumes Era I victories. Chapter 5 prior-entry is a first-visit probe; later chapters are old-gear stress probes. Deterministic outcomes are not human probabilities.',
    baseline:{recovery:CONFIG.encounterManaRecovery,baseRegen:CONFIG.manaRegen},chapters,loadouts,probes,routes:routeRows };
}
// Keep reviewable aggregated evidence in Git; full seed-by-seed traces can be
// reproduced into ignored tmp/ with the optional fourth CLI argument.
export function summarizeReport(report) {
  const mean=(rows,key)=>rows.length?rows.reduce((sum,row)=>sum+row[key],0)/rows.length:null;
  const stats=rows=>({attempts:rows.length,wins:rows.filter(r=>r.won).length,safe:rows.filter(r=>r.safe).length,
    ...Object.fromEntries(['seconds','casts','effectiveHealing','overhealing','damage','manaSpent','manaRegenerated','entryMana','exitMana','recovery','netManaMovement','deaths','nearDeaths','triageSeconds','bleedDamage'].map(key=>[key,mean(rows,key)])),
    durationRange:[Math.min(...rows.map(r=>r.seconds)),Math.max(...rows.map(r=>r.seconds))]});
  const {probes,routes:paths,...metadata}=report;
  return {...metadata,precision:'Numbers rounded to three decimal places.',probeCount:probes.length,routeCount:paths.length,
    encounters:CHAPTERS.slice(4).flatMap(chapter=>chapter.nodes.filter(n=>n.encounter).map(node=>({chapter:chapter.ordinal,node:node.id,
      name:CHAPTER_ENCOUNTERS[node.encounter].name,kind:node.kind,mechanics:CHAPTER_ENCOUNTERS[node.encounter].mechanics,phases:CHAPTER_ENCOUNTERS[node.encounter].phases,
      results:['prior-entry','prior-farmed','prior-catalogue'].flatMap(stage=>builds.flatMap(build=>['idle','oneHot','oneWave','oneStream','conservative'].map(policy=>({stage,build,policy,
        ...stats(probes.filter(r=>r.node===node.id&&r.stage===stage&&r.build===build&&r.policy===policy))}))))}))),
    routes:CHAPTERS.slice(4).flatMap(chapter=>routes(chapter).flatMap((path,pathIndex)=>['prior-entry','prior-farmed','prior-catalogue'].flatMap(stage=>builds.flatMap(build=>['conservative','wasteful'].map(policy=>{
      const selected=paths.filter(r=>r.chapter===chapter.ordinal&&r.pathIndex===pathIndex&&r.stage===stage&&r.build===build&&r.policy===policy);
      const reached=selected.filter(r=>r.bossEntryMana!==null),rows=selected.flatMap(r=>r.encounters.filter(e=>!e.utility));
      return {chapter:chapter.ordinal,pathIndex,path:path.map(n=>n.id),stage,build,policy,attempts:selected.length,wins:selected.filter(r=>r.won).length,safe:selected.filter(r=>r.safe).length,
        bossReached:reached.length,bossEntryMana:mean(reached,'bossEntryMana'),totalHealing:rows.reduce((s,r)=>s+r.effectiveHealing,0),
        ...Object.fromEntries(['manaSpent','manaRegenerated','recovery','netManaMovement'].map(key=>[key,rows.reduce((s,r)=>s+r[key],0)])),
        deaths:rows.reduce((s,r)=>s+r.deaths,0),nearDeaths:rows.reduce((s,r)=>s+r.nearDeaths,0)};
    })))))};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const samples=Number(process.argv[2]||4);
  if (!Number.isInteger(samples)||samples<1) throw new Error('samples must be a positive integer');
  const report=evaluate(samples);
  const round=(_,value)=>typeof value==='number'?Math.round(value*1000)/1000:value;
  writeFileSync(process.argv[3]||'docs/bat-97-probes.json',JSON.stringify(summarizeReport(report),round)+'\n');
  if(process.argv[4]) writeFileSync(process.argv[4],JSON.stringify(report)+'\n');
  console.log(JSON.stringify({acceptance:report.finalBalanceAcceptance,chapters:report.chapters},round));
}
