// BAT-99: actual acquisition snapshots, Shaman only, production carried resources.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CHAPTERS, CHAPTER_ENCOUNTERS, CONFIG } from '../src/data.js';
import { fullResources, recoverEncounterMana } from '../src/chapter-runs.js';
import { progressionWitness, equipmentForSnapshot, acquisitionSeed } from './era2-gear.mjs';
import { probe, probeRoute, builds } from './era2-content.mjs';
import { routes } from './boss-balance.mjs';

export const stages = ['previous','early','partial','veryGood','average','nearComplete'];
export const strategies = ['normal','elite','shrine'];
export function representativePaths(chapter) {
  return strategies.map(strategy => ({strategy,path:routes(chapter).find(path => strategy === 'normal'
    ? !path.some(n=>['elite','shrine'].includes(n.kind)) : path.some(n=>n.kind===strategy))}));
}
export function evaluateBalance(samples=4) {
  const encounters=[],paths=[],loadouts=[],footholds=[],priorBoss=[];
  for(let i=0;i<samples;i++) {
    const seed=acquisitionSeed(i), witness=progressionWitness(seed);
    const prior=equipmentForSnapshot(witness[0].states.previous,'shaman').party('shaman');
    for(const build of builds) {
      const {resources,...result}=probe(CHAPTER_ENCOUNTERS[CHAPTERS[3].nodes.at(-1).encounter],prior,build,seed);
      priorBoss.push({seed,build,...result});
    }
    for(const chapter of CHAPTERS.slice(4)) {
      const states=witness.find(c=>c.chapter===chapter.ordinal).states;
      const prefixes=[...new Map(routes(chapter).filter(path=>!path.some(n=>['elite','shrine'].includes(n.kind)))
        .map(path=>path.slice(0,2)).map(path=>[path.map(n=>n.id).join(','),path])).values()];
      for(const stage of stages) {
        const state=states[stage],party=equipmentForSnapshot(state,'shaman').party('shaman');
        const loadout=loadouts.length;loadouts.push({seed,chapter:chapter.ordinal,stage,...state});
        for(const build of builds) {
          const context={seed,chapter:chapter.ordinal,stage,build,currentSlots:state.current,loadout};
          for(const node of chapter.nodes.filter(n=>n.encounter)) {
            for(const policy of ['idle','oneHot','oneWave','oneStream','conservative']) {
              const {resources,...result}=probe(CHAPTER_ENCOUNTERS[node.encounter],party,build,seed,fullResources(party),policy);
              const recovery=result.won&&node.kind!=='boss'?recoverEncounterMana(resources).mana.current-result.exitMana:0;
              encounters.push({...context,node:node.id,kind:node.kind,policy,...result,recovery,netManaMovement:result.exitMana+recovery-result.entryMana});
            }
          }
          for(const {strategy,path} of representativePaths(chapter)) for(const policy of ['conservative','average','wasteful']) {
            paths.push({...context,strategy,path:path.map(n=>n.id),policy,...probeRoute(chapter,path,party,build,seed,policy)});
          }
          if(stage==='previous')for(const prefix of prefixes)for(const policy of ['conservative','average']) {
            let resources=fullResources(party);const rows=[];
            for(const node of prefix) {
              const {resources:exit,...result}=probe(CHAPTER_ENCOUNTERS[node.encounter],party,build,seed,resources,policy);
              resources=result.won?recoverEncounterMana(exit):exit;
              rows.push({node:node.id,...result,recovery:resources.mana.current-result.exitMana,
                netManaMovement:resources.mana.current-result.entryMana});
              if(!result.won)break;
            }
            footholds.push({...context,prefix:prefix.map(n=>n.id),policy,won:rows.length===2&&rows.every(r=>r.won),safe:rows.length===2&&rows.every(r=>r.safe),encounters:rows});
          }
        }
      }
    }
    console.error(`Completed seed ${i+1}/${samples}`);
  }
  return {schemaVersion:1,samples,referenceHealer:'shaman',builds,stages,baseline:{recovery:CONFIG.encounterManaRecovery,baseRegen:CONFIG.manaRegen},
    method:'Real BAT-98 normal-route acquisition; unique owned items and equipment assignment; 0/early/~6/~13/~18/26+ equipped current slots. Inherited ~18-slot previous state plus actual boss rewards. Acquisition assumes victories; independently validate prior bosses, footholds, all fights and carried-resource routes. Three eight-point Shaman builds; conservative public-warning forecast at 120ms, average same choices at 700ms, wasteful spends spare casts on Wave. Deterministic outcomes are diagnostics, not human probabilities. No gear multipliers. Isolated probes start full; routes carry wounds/Mana, with production recovery and shrine utility.',
    loadouts,priorBoss,footholds,encounters,paths};
}
const mean=(rows,key)=>rows.length?rows.reduce((sum,r)=>sum+(r[key]||0),0)/rows.length:null;
export function summarize(rows) {
  return {attempts:rows.length,wins:rows.filter(r=>r.won).length,safe:rows.filter(r=>r.safe).length,
    ...Object.fromEntries(['seconds','casts','effectiveHealing','damage','overhealing','manaSpent','manaRegenerated','entryMana','maxMana','exitMana','recovery','netManaMovement','deaths','nearDeaths','triageSeconds'].map(key=>[key,mean(rows,key)]))};
}
export function summarizeBalance(report) {
  const {encounters,paths,footholds,...metadata}=report;
  const routeGroups=new Map();
  for(const row of paths) {
    const key=[row.chapter,row.stage,row.build,row.strategy,row.policy].join(':');
    if(!routeGroups.has(key))routeGroups.set(key,[]);routeGroups.get(key).push(row);
  }
  return {...metadata,loadouts:report.loadouts.filter(r=>r.seed===acquisitionSeed(0)),
    counts:{isolated:encounters.length,routes:paths.length,footholds:footholds.length},
    footholds:CHAPTERS.slice(4).flatMap(c=>['conservative','average'].map(policy=>{const rows=footholds.filter(r=>r.chapter===c.ordinal&&r.policy===policy);return {
      chapter:c.ordinal,policy,attempts:rows.length,wins:rows.filter(r=>r.won).length,safe:rows.filter(r=>r.safe).length,
      fights:summarize(rows.flatMap(r=>r.encounters))};})),
    passive:{attempts:encounters.filter(r=>r.policy!=='conservative').length,safe:encounters.filter(r=>r.policy!=='conservative'&&r.safe)},
    encounters:CHAPTERS.slice(4).flatMap(c=>c.nodes.filter(n=>n.encounter).flatMap(n=>stages.flatMap(stage=>builds.map(build=>({chapter:c.ordinal,node:n.id,kind:n.kind,stage,build,
      currentSlots:[...new Set(encounters.filter(r=>r.node===n.id&&r.stage===stage&&r.build===build).map(r=>r.currentSlots))],
      ...summarize(encounters.filter(r=>r.node===n.id&&r.stage===stage&&r.build===build&&r.policy==='conservative'))}))))),
    routes:[...routeGroups.values()].map(rows=>{const {chapter,stage,build,strategy,path,policy}=rows[0];return {chapter,stage,build,strategy,path,policy,
      currentSlots:[...new Set(rows.map(r=>r.currentSlots))],attempts:rows.length,wins:rows.filter(r=>r.won).length,safe:rows.filter(r=>r.safe).length,bossReached:rows.filter(r=>r.bossEntryMana!==null).length,
      bossEntryMana:mean(rows.filter(r=>r.bossEntryMana!==null),'bossEntryMana'),
      encounters:[...path,CHAPTERS[chapter-1].nodes.at(-1).id].map(node=>{const fights=rows.flatMap(r=>r.encounters).filter(r=>r.node===node);return {node,...summarize(fights),
        ...(fights[0]?.utility?{utility:fights[0].utility,before:fights[0].before,after:fights[0].after}:{})};})};})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const samples=Number(process.argv[2]||4);if(!Number.isInteger(samples)||samples<1)throw Error('samples must be positive');
  const report=evaluateBalance(samples),summary=summarizeBalance(report);
  writeFileSync(process.argv[3]||'docs/bat-99-balance.json',JSON.stringify(summary,(_,v)=>typeof v==='number'?Math.round(v*1000)/1000:v)+'\n');
  if(process.argv[4])writeFileSync(process.argv[4],JSON.stringify(report)+'\n');
  console.log(JSON.stringify({counts:summary.counts,passiveSafe:summary.passive.safe.length,footholds:summary.footholds,
    bosses:CHAPTERS.slice(4).map(c=>({chapter:c.ordinal,states:['veryGood','average','nearComplete'].map(stage=>({stage,
      ...summarize(report.paths.filter(r=>r.chapter===c.ordinal&&r.stage===stage&&r.policy==='conservative'))}))}))}));
}
