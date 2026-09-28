// BAT-102: reproducible paired Priest/Shaman route comparison. No production mutations.
// node scripts/bat-102-comparison.mjs [era1Seeds=30] [era2Seeds=4] [output]
import { writeFileSync } from 'node:fs';
import { CHAPTERS, CHAPTER_ENCOUNTERS } from '../src/data.js';
import { fullResources, recoverEncounterMana } from '../src/chapter-runs.js';
import { progressionWitness, equipmentForSnapshot, acquisitionSeed } from './era2-gear.mjs';
import { representativePaths } from './era2-balance.mjs';
import { builds, routeTrial, simulate } from './shaman-balance.mjs';
import { decide } from './talent-balance.mjs';
import { decideShamanPriority, expectedDamage, pendingHealing } from './shaman-priority.mjs';

const era1Seeds=Number(process.argv[2]||30),era2Seeds=Number(process.argv[3]||4);
if(!Number.isInteger(era1Seeds)||era1Seeds<1||!Number.isInteger(era2Seeds)||era2Seeds<1)throw Error('positive integer cohorts required');
const selections={
  1:{priest:['1-binding'],shaman:['1-reserves']},
  2:{priest:['3-binding'],shaman:['3-waves']},
  3:{priest:['5-penance'],shaman:['5-flow']},
  4:{priest:['7-fourfold','7-sanctuary','7-echo'],shaman:['7-earth','7-tide','7-ancestral']},
  late:{priest:['8-twin','8-sanctuary','8-fervor'],shaman:['8-earth','8-ancestral','8-tide']},
};
const mean=(rows,get)=>rows.length?rows.reduce((sum,row)=>sum+get(row),0)/rows.length:null;
function summarize(rows){
  const reached=rows.filter(row=>row.bossEntryMana!==null),full=rows.filter(row=>row.won);
  const fights=rows.flatMap(row=>row.encounters.filter(e=>!e.utility));
  return {attempts:rows.length,routeProgress:reached.length/rows.length,fullCompletion:full.length/rows.length,
    safeCompletion:rows.filter(row=>row.safe).length/rows.length,
    partySurvival:mean(fights,e=>Number(e.deaths===0)),deaths:mean(rows,row=>row.encounters.reduce((n,e)=>n+(e.deaths||0),0)),
    effectiveHealing:mean(rows,row=>row.encounters.reduce((n,e)=>n+(e.effectiveHealing||0),0)),
    overhealing:mean(rows,row=>row.encounters.reduce((n,e)=>n+(e.overhealing||0),0)),
    manaSpent:mean(rows,row=>row.encounters.reduce((n,e)=>n+(e.manaSpent||0),0)),
    depletionRate:mean(fights,e=>Number(e.depleted)),bossEntryMana:mean(reached,row=>row.bossEntryMana),
    bossEntryManaFraction:mean(reached,row=>row.bossEntryMana/row.bossMaxMana)};
}
function earlyRow(chapter,healer,build,skill,index){
  const result=routeTrial(chapter,healer,skill,'ready',index,build,'current',
    {policy:healer==='shaman'?decideShamanPriority:null});
  const boss=result.encounters.find(e=>e.boss);
  return {chapter,healer,build,skill,stage:'ready',seed:index,strategy:'sampled',
    won:!!boss?.won,safe:!!boss?.won&&result.encounters.every(e=>e.deaths===0),
    bossEntryMana:result.bossEntryMana,bossMaxMana:boss?.entryResources.mana.max??null,
    encounters:result.encounters.map(e=>({node:e.encounter,won:e.won,deaths:e.deaths,
      effectiveHealing:e.effective,overhealing:e.overheal,manaSpent:e.manaSpent,
      depleted:e.depletedAt!==null,entryMana:e.entryResources.mana.current,exitMana:e.remainingMana}))};
}
function policyFor(healer){return healer==='shaman'?(game)=>{
  if(game.cast)return;
  if(game.party.some(p=>p.hp>0&&(p.hp/p.maxHp<.45||
    (p.hp-expectedDamage(game,p,3)+pendingHealing(game,p,3))/p.maxHp<.65)))decideShamanPriority(game);
}:game=>decide(game,'priest','veryGood');}
const witnesses=new Map();
function lateRow(chapter,healer,build,stage,index,strategy='normal'){
  const seed=acquisitionSeed(index),key=`${healer}:${seed}`;
  if(!witnesses.has(key))witnesses.set(key,progressionWitness(seed,healer));
  const witness=witnesses.get(key);
  const state=witness.find(c=>c.chapter===chapter).states[stage];
  const party=equipmentForSnapshot(state,healer).party(healer);
  const chapterData=CHAPTERS[chapter-1],path=representativePaths(chapterData).find(p=>p.strategy===strategy).path;
  let resources=fullResources(party),bossEntryMana=null,bossMaxMana=null;
  const encounters=[];
  for(const [position,node] of [...path,chapterData.nodes.at(-1)].entries()){
    if(!node.encounter)continue;
    const fight=simulate(CHAPTER_ENCOUNTERS[node.encounter],party,healer,builds[healer][build],seed+position*1000,
      resources,{policy:policyFor(healer),seconds:180});
    if(node.kind==='boss'){
      bossEntryMana=fight.entryResources.mana.current;
      bossMaxMana=fight.entryResources.mana.max;
    }
    encounters.push({node:node.id,won:fight.won,deaths:fight.deaths,effectiveHealing:fight.effective,
      overhealing:fight.overheal,manaSpent:fight.manaSpent,depleted:fight.depletedAt!==null,
      entryMana:fight.entryResources.mana.current,exitMana:fight.remainingMana});
    resources=fight.won&&node.kind!=='boss'?recoverEncounterMana(fight.resources):fight.resources;
    if(!fight.won)break;
  }
  const won=encounters.at(-1)?.node===chapterData.nodes.at(-1).id&&encounters.at(-1).won;
  return {chapter,healer,build,skill:'veryGood',stage,seed,strategy,currentSlots:state.current,
    won,safe:won&&encounters.every(e=>e.deaths===0),bossEntryMana,bossMaxMana,encounters};
}
const rows=[];
for(let chapter=1;chapter<=4;chapter++)for(const healer of ['priest','shaman'])
  for(const build of selections[chapter][healer])for(const skill of ['veryGood','average'])
    for(let index=0;index<era1Seeds;index++)rows.push(earlyRow(chapter,healer,build,skill,index));
console.error(`Era I: ${rows.length} paired route samples`);
for(let chapter=5;chapter<=8;chapter++)for(const healer of ['priest','shaman'])
  for(const build of selections.late[healer])for(const stage of ['previous','veryGood','average'])
    for(let index=0;index<era2Seeds;index++)rows.push(lateRow(chapter,healer,build,stage,index));
console.error(`Total: ${rows.length} route samples`);
const groups=[];
for(const chapter of CHAPTERS)for(const healer of ['priest','shaman']){
  const selected=rows.filter(r=>r.chapter===chapter.ordinal&&r.healer===healer);
  for(const skill of [...new Set(selected.map(r=>r.skill))])for(const stage of [...new Set(selected.map(r=>r.stage))]){
    const subset=selected.filter(r=>r.skill===skill&&r.stage===stage);
    groups.push({chapter:chapter.ordinal,healer,skill,stage,...summarize(subset),builds:Object.fromEntries([...new Set(subset.map(r=>r.build))].map(build=>[build,summarize(subset.filter(r=>r.build===build))]))});
  }
}
const output={schemaVersion:1,era1Seeds,era2Seeds,method:'Era I: current BAT-89 routeTrial, ready stage, common index seeds, own actual seeded loot, adaptive Shaman and existing Priest decision policy; chapters 1-3 one build, chapter 4 three legal 7-point builds. Era II: BAT-98 acquisition seeds, own actual gear at previous/~13/~18 current slots, three legal 8-point builds, one representative normal route with production 20% non-boss Mana recovery. Shaman BAT-100 conservative pressure gate; Priest existing decision policy. Seed pairing shares labels but class loot RNG can diverge. Gear acquisition assumes prior farming victories. Bot outcomes are diagnostic, not player win probabilities.',selections,groups,
  equalWeight:Object.fromEntries(['priest','shaman'].map(healer=>{
    const chapters=CHAPTERS.map(c=>groups.find(g=>g.chapter===c.ordinal&&g.healer===healer&&g.stage===(c.ordinal<=4?'ready':'veryGood')&&g.skill==='veryGood'));
    return [healer,Object.fromEntries(['routeProgress','fullCompletion','safeCompletion','partySurvival','deaths','effectiveHealing','overhealing','manaSpent','depletionRate','bossEntryManaFraction'].map(key=>[key,mean(chapters,row=>row[key]??0)]))];
  })),rows};
writeFileSync(process.argv[4]||'tmp/bat-102-comparison.json',JSON.stringify(output)+'\n');
console.log(JSON.stringify({groups,equalWeight:output.equalWeight}));
