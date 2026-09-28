// BAT-103 fixed-cohort matched comparison: node scripts/bat-103-parity.mjs <healer> <output> [era1=8] [era2=2]
import {writeFileSync} from 'node:fs';
import {CHAPTERS,CHAPTER_ENCOUNTERS} from '../src/data.js';
import {fullResources,recoverEncounterMana} from '../src/chapter-runs.js';
import {routeTrial,simulate,builds,controlledEncounter,equivalentParty} from './shaman-balance.mjs';
import {partyForHealer} from '../src/data.js';
import {decideShamanPriority,expectedDamage,pendingHealing} from './shaman-priority.mjs';
import {decide} from './talent-balance.mjs';
import {acquisitionSeed,progressionWitness,equipmentForSnapshot} from './era2-gear.mjs';
import {representativePaths} from './era2-balance.mjs';
const healer=process.argv[2],out=process.argv[3],n1=Number(process.argv[4]||8),n2=Number(process.argv[5]||2);
if(!['shaman','druid'].includes(healer)||!out)throw Error('Usage: healer output [era1] [era2]');
const b1=healer==='shaman'?['1-reserves','3-waves','5-flow','7-earth']:['1-rejuvenation','3-rejuvenation','5-nourishment','7-blooming'];
const b2=healer==='shaman'?['8-earth','8-ancestral','8-tide']:['8-twin','8-genesis','8-tranquility'];
// The generic BAT-82 bot treats Twin's second Rejuvenation as a cheap default.
// Reserve that optional stack for an ally forecast below 60% within six seconds;
// protect the last quarter of Mana for the rest of the route. Combat is unchanged.
const druidPolicy=(g,skill='veryGood')=>{
  const begin=g.begin;
  g.begin=(id,target)=>{
    if(id==='rejuvenation'){
      const p=g.party.find(member=>member.id===target);
      if(p&&g.activeHots(p,['rejuvenation']).length){
        const pending=g.activeHots(p,['rejuvenation','regrowth','wildGrowth','nourish'])
          .reduce((sum,hot)=>sum+hot.heal*Math.max(0,Math.min(hot.ticks,
            Math.floor((g.time+6-hot.next)/hot.interval+1e-8)+1)),0);
        const projected=(p.hp-expectedDamage(g,p,6)+pending)/p.maxHp;
        if(projected>=.60||g.mana/g.maxMana<=.25)return {ok:false};
      }
    }
    return begin.call(g,id,target);
  };
  try{decide(g,'druid',skill);}finally{g.begin=begin;}
};
const originalDruidPolicy=process.env.BAT103_ORIGINAL_DRUID_POLICY==='1';
const policy=healer==='shaman'?decideShamanPriority:originalDruidPolicy?g=>decide(g,'druid','veryGood'):druidPolicy;
const era2Policy=healer==='shaman'?g=>{if(g.party.some(p=>p.hp>0&&(p.hp/p.maxHp<.45||(p.hp-expectedDamage(g,p,3)+pendingHealing(g,p,3))/p.maxHp<.65)))decideShamanPriority(g);}:policy;
const rows=[];
const add=(context,fights,bossEntryMana)=>{
  rows.push({...context,healer,reachedBoss:bossEntryMana!==null,won:!!fights.at(-1)?.boss&&fights.at(-1).won,
    survived:fights.every(f=>f.survived),deaths:fights.reduce((n,f)=>n+f.deaths,0),
    effectiveHealing:fights.reduce((n,f)=>n+f.effectiveHealing,0),overheal:fights.reduce((n,f)=>n+f.overheal,0),
    manaSpent:fights.reduce((n,f)=>n+f.manaSpent,0),depletionFights:fights.filter(f=>f.depleted).length,
    bossEntryMana,fights});
};
for(let chapter=1;chapter<=4;chapter++)for(const skill of ['veryGood','average'])for(let index=0;index<n1;index++){
  const r=routeTrial(chapter,healer,skill,'ready',index,b1[chapter-1],'current',
    {policy:healer==='shaman'?decideShamanPriority:originalDruidPolicy?null:druidPolicy});
  add({era:1,chapter,skill,stage:'ready',build:b1[chapter-1],seedIndex:index},
    r.encounters.map(f=>({encounter:f.encounter,boss:f.boss,won:f.won,survived:f.survived,deaths:f.deaths,
      effectiveHealing:f.effective,overheal:f.overheal,manaSpent:f.manaSpent,depleted:f.depletedAt!==null,
      entryMana:f.entryResources.mana.current,remainingMana:f.remainingMana})),r.bossEntryMana);
}
console.error('Era I complete: '+healer);
for(let index=0;index<n2;index++){
  const seed=acquisitionSeed(index),witness=progressionWitness(seed,healer);
  for(const chapter of CHAPTERS.slice(4))for(const stage of ['veryGood','average']){
    const state=witness.find(c=>c.chapter===chapter.ordinal).states[stage],party=equipmentForSnapshot(state,healer).party(healer);
    const path=representativePaths(chapter).find(p=>p.strategy==='normal').path;
    for(const build of b2){
      let resources=fullResources(party),bossEntryMana=null;const fights=[];
      for(const [position,node]of [...path,chapter.nodes.at(-1)].entries()){
        const r=simulate(CHAPTER_ENCOUNTERS[node.encounter],party,healer,builds[healer][build],
          seed+position*1000,resources,{policy:era2Policy,skill:'veryGood'});
        if(node.kind==='boss')bossEntryMana=r.entryResources.mana.current;
        fights.push({encounter:node.encounter,boss:node.kind==='boss',won:r.won,survived:r.survived,
          deaths:r.deaths,effectiveHealing:r.effective,overheal:r.overheal,manaSpent:r.manaSpent,
          depleted:r.depletedAt!==null,entryMana:r.entryResources.mana.current,remainingMana:r.remainingMana,casts:r.casts,effectiveBySpell:r.bySpell,rawBySpell:r.rawBySpell});
        if(!r.won)break;
        resources=node.kind==='boss'?r.resources:recoverEncounterMana(r.resources);
      }
      add({era:2,chapter:chapter.ordinal,skill:'veryGood',stage,build,seedIndex:index,currentSlots:state.current},fights,bossEntryMana);
    }
  }
  console.error('Era II seed '+(index+1)+'/'+n2+': '+healer);
}
const mean=(g,k)=>g.length?g.reduce((s,r)=>s+Number(r[k]??0),0)/g.length:null;
const summarize=g=>{const reached=g.filter(r=>r.reachedBoss);return {n:g.length,routeCompletion:mean(g,'reachedBoss'),
  fullCompletion:mean(g,'won'),survival:mean(g,'survived'),deaths:mean(g,'deaths'),
  effectiveHealing:mean(g,'effectiveHealing'),overheal:mean(g,'overheal'),manaSpent:mean(g,'manaSpent'),
  depletionFights:mean(g,'depletionFights'),bossEntryMana:mean(reached,'bossEntryMana')}};
const summary={overall:summarize(rows),chapters:CHAPTERS.map(c=>({chapter:c.ordinal,
  ...summarize(rows.filter(r=>r.chapter===c.ordinal)),
  stages:[...new Set(rows.filter(r=>r.chapter===c.ordinal).map(r=>r.stage))].map(stage=>({stage,
    ...summarize(rows.filter(r=>r.chapter===c.ordinal&&r.stage===stage))}))}))};
const controlled=[];
for(let chapter=1;chapter<=4;chapter++)for(const profile of ['focused','aoe','burst','groupBurst'])for(let index=0;index<8;index++){
  const seed=87000+chapter*10000+index;
  const r=simulate(controlledEncounter(chapter,profile,2),equivalentParty(chapter,healer,seed),healer,
    builds[healer][b1[chapter-1]],seed+999,null,{policy,seconds:90});
  controlled.push({chapter,profile,index,won:r.won,survived:r.survived,deaths:r.deaths,
    effectiveHealing:r.effective,overheal:r.overheal,manaSpent:r.manaSpent,depleted:r.depletedAt!==null,
    remainingMana:r.remainingMana});
}
for(let index=0;index<n2;index++){
  const seed=acquisitionSeed(index),witness=progressionWitness(seed,'shaman');
  for(const chapter of CHAPTERS.slice(4)){
    const state=witness.find(c=>c.chapter===chapter.ordinal).states.average;
    const reference=equipmentForSnapshot(state,'shaman').party('shaman');
    const identity=partyForHealer(healer).find(p=>p.label==='HEALER');
    const party=reference.map(p=>p.label==='HEALER'?{...p,id:identity.id,name:identity.name,class:identity.class}:{...p});
    for(const node of [chapter.nodes.find(n=>n.encounter),chapter.nodes.at(-1)])for(const build of b2){
      const r=simulate(CHAPTER_ENCOUNTERS[node.encounter],party,healer,builds[healer][build],seed,
        fullResources(party),{policy:era2Policy,skill:'veryGood'});
      controlled.push({chapter:chapter.ordinal,profile:node.kind,index,build,won:r.won,survived:r.survived,
        deaths:r.deaths,effectiveHealing:r.effective,overheal:r.overheal,manaSpent:r.manaSpent,
        depleted:r.depletedAt!==null,remainingMana:r.remainingMana});
    }
  }
}
const controlledSummary=CHAPTERS.map(c=>({chapter:c.ordinal,...summarize(controlled.filter(r=>r.chapter===c.ordinal)),
  profiles:[...new Set(controlled.filter(r=>r.chapter===c.ordinal).map(r=>r.profile))].map(profile=>({profile,
    ...summarize(controlled.filter(r=>r.chapter===c.ordinal&&r.profile===profile))}))}));
writeFileSync(out,JSON.stringify({healer,druidPolicy:originalDruidPolicy?'original':'twin-forecast-guard',era1Samples:n1,era2Samples:n2,controlledSummary,controlled,method:
  'Era I: BAT-89 routeTrial, ready gear, veryGood/average, indexed seed cohorts; legacy no postfight Mana recovery. Era II: class-legal BAT-98 acquisition snapshots, common seeds, three 8-point builds, veryGood/average checkpoints, same normal path and fight seeds, carried resources with 20% recovery. Shaman adaptive priority. Druid policy is recorded separately as original or the fixed Twin guard. Bot diagnostics, not player win probabilities.',summary,rows},null,2)+'\n');
console.log(JSON.stringify(summary));
