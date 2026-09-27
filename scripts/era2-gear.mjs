// BAT-98 acquisition uses production loot rules and fixed, uniquely owned items.
// Victories are assumed here; BAT-97 must validate them in Combat independently.
// node scripts/era2-gear.mjs [samples=64] [output=docs/bat-98-acquisition.json]
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { GEAR, CHAPTERS, HEALERS } from '../src/data.js';
import { Equipment } from '../src/gear.js';
import { slotsForOwner, canEquipItem } from '../src/item-model.js';
import { damageMultiplierForDefense, effectiveAttackInterval } from '../src/stats.js';
import { NORMAL_LOOT_TABLES, BOSS_BONUS_LOOT_TABLES, ELITE_BONUS_LOOT_TABLES, eligibleLootPool, rollNormalLoot, rollBossBonusLoot, rollEliteRewardChoice, normalDropCount } from '../src/loot.js';
import { seeded, routes, recursiveInheritedEquipment, regeared } from './boss-balance.mjs';
import { capacity } from './gear-value-probes.mjs';

const round = n => Math.round(n * 100) / 100;
const mean = values => round(values.reduce((a,b)=>a+b,0)/values.length);
export const acquisitionSeed = index => 980000 + index * 104729;
export function gearSnapshot(equipment, healer, chapter) {
  const party = equipment.party(healer);
  const roles = Object.fromEntries(party.map(member => {
    const slots = slotsForOwner(member.id), current = slots.filter(slot => equipment.item(member,slot)?.chapter === chapter);
    return [member.id,{ current:current.length,total:slots.length,previousSlots:slots.filter(slot => !current.includes(slot)),
      stats:Object.fromEntries(['maxHp','armor','resistance','damage','spellPower','maxMana','manaRegen','haste','crit'].map(stat=>[stat,round(member[stat]||0)])) }];
  }));
  const current = Object.values(roles).reduce((sum,role)=>sum+role.current,0);
  return { current,total:27,percent:round(current/27*100),roles,
    unequippedCurrentItems:equipment.collection().filter(item=>item.chapter===chapter&&!equipment.isEquipped(item)).length,
    partyHealth:round(party.reduce((sum,p)=>sum+p.maxHp,0)),
    physicalEffectiveHealth:round(party.reduce((sum,p)=>sum+p.maxHp/damageMultiplierForDefense(p.armor||0),0)),
    magicEffectiveHealth:round(party.reduce((sum,p)=>sum+p.maxHp/damageMultiplierForDefense(p.resistance||0),0)),
    companionDps:round(party.filter(p=>p.id!==healer).reduce((sum,p)=>sum+p.damage/effectiveAttackInterval(p.interval,p.haste||0),0)),
    loadout:structuredClone(equipment.equipped) };
}
// Era II assignment evaluates real effective Health for armor. A small exact
// matching over the five owners avoids greedy allocation stranding a weak slot.
export function equipEra2(equipment, healer) {
  const next = new Equipment(); equipment.collection().forEach(item=>next.acquire(item.id));
  const owners = [healer,'tank','rogue','mage','ranger'];
  const utility=(owner,stats)=> {
    const physical=owner==='tank'?.7:.5;
    return stats.maxHp*(physical/damageMultiplierForDefense(stats.armor||0)+(1-physical)/damageMultiplierForDefense(stats.resistance||0));
  };
  // Role items are independent and keep the established Mana/throughput score.
  for(const owner of owners)for(const slot of slotsForOwner(owner).filter(slot=>!['Head','Chest','Legs'].includes(slot))) {
    const candidates=next.collection().filter(item=>canEquipItem(owner,slot,item)&&!next.equippedAt(item.id));
    const value=item=>item.role==='healer'?(item.stats.spellPower||0)/5+(item.stats.maxMana||0)/35+(item.stats.manaRegen||0)*8+(item.stats.haste||0)/2+(item.stats.crit||0)/2
      : item.stats.damage||utility(owner,{...next.apply({id:owner,maxHp:500}),...item.stats});
    candidates.sort((a,b)=>value(b)-value(a)||a.id.localeCompare(b.id));
    if(candidates[0])next.equip({id:owner},slot,candidates[0].id);
  }
  for(const slot of ['Chest','Head','Legs']) {
    const candidates=next.collection().filter(item=>item.role==='all'&&item.slot===slot),base=next.party(healer);
    let dp=new Map([[0,{score:0,pairs:[]}]]);
    for(const item of candidates) {
      const updated=new Map(dp);
      for(const [mask,state] of dp)for(let index=0;index<owners.length;index++)if(!(mask&(1<<index))) {
        const owner=owners[index],member=base.find(p=>p.id===owner),stats={...member};
        for(const [stat,value] of Object.entries(item.stats))stats[stat]=(stats[stat]||0)+value;
        const score=state.score+utility(owner,stats)-utility(owner,member),key=mask|(1<<index);
        if(!updated.has(key)||score>updated.get(key).score)updated.set(key,{score,pairs:[...state.pairs,{owner,item}]});
      }
      dp=updated;
    }
    const best=[...dp.values()].sort((a,b)=>b.score-a.score)[0];
    for(const {owner,item} of best.pairs)next.equip({id:owner},slot,item.id);
  }
  return next;
}
const copy = equipEra2;
export function chooseEliteItem(equipment, healer, chapter, items) {
  const baseline=gearSnapshot(copy(equipment,healer),healer,chapter);
  const value=s=>s.physicalEffectiveHealth/100+s.magicEffectiveHealth/100+s.companionDps*3
    +s.roles[healer].stats.spellPower/5+s.roles[healer].stats.maxMana/35+s.roles[healer].stats.manaRegen*8;
  return items.map(item=>{
    const next=copy(equipment,healer);next.acquire(item.id);
    const state=gearSnapshot(copy(next,healer),healer,chapter);
    return {item,score:(state.current-baseline.current)*100+value(state)-value(baseline)};
  }).sort((a,b)=>b.score-a.score||a.item.id.localeCompare(b.item.id))[0]?.item;
}
function award(node,equipment,healer,chapter,rng,metrics,eliteChoice=true) {
  const table=NORMAL_LOOT_TABLES[node.encounter];
  if(!table)return;
  metrics.victories++;
  const eligible=eligibleLootPool(table,equipment.ownedIds,healer);
  metrics.ownedTableFractionSum+=1-eligible.length/table.length;
  metrics.emptyPoolVictories+=Number(!eligible.length);
  let first=null;
  const rewards=rollNormalLoot(table,equipment.ownedIds,healer,()=>{const n=rng();if(first===null)first=n;return n;});
  metrics.normalRequested+=normalDropCount(()=>first);metrics.normalGranted+=rewards.length;
  metrics.byEncounter[node.id] ||= {victories:0,normalGranted:0,eliteClaims:0,bossBonus:0};
  const entry=metrics.byEncounter[node.id];entry.victories++;entry.normalGranted+=rewards.length;
  for(const item of rewards) { if(!equipment.acquire(item.id))metrics.duplicateGrants++; }
  if(node.kind==='elite' && eliteChoice) {
    metrics.eliteVictories++;
    const roll=rollEliteRewardChoice(node.encounter,equipment.ownedIds,healer,rng);
    metrics.eliteSuccessfulRolls+=Number(roll.succeeded);
    const selected=chooseEliteItem(equipment,healer,chapter,roll.items);
    if(selected) {
      const before=gearSnapshot(copy(equipment,healer),healer,chapter).current;
      equipment.acquire(selected.id);metrics.eliteClaims++;entry.eliteClaims++;
      metrics.eliteSlotGains+=Math.max(0,gearSnapshot(copy(equipment,healer),healer,chapter).current-before);
    } else if(roll.succeeded)metrics.eliteExhausted++;
  }
  if(node.kind==='boss') {
    const bonus=rollBossBonusLoot(BOSS_BONUS_LOOT_TABLES[node.encounter],equipment.ownedIds,healer,rng);
    bonus.forEach(item=>equipment.acquire(item.id));metrics.bossBonus+=bonus.length;entry.bossBonus+=bonus.length;
  }
}
const freshMetrics=()=>({victories:0,normalRequested:0,normalGranted:0,duplicateGrants:0,emptyPoolVictories:0,ownedTableFractionSum:0,
  eliteVictories:0,eliteSuccessfulRolls:0,eliteClaims:0,eliteSlotGains:0,eliteExhausted:0,bossBonus:0,byEncounter:{}});
const pathsFor=(chapter,strategy)=>routes(chapter).filter(path=>strategy==='elite' ? path.some(n=>n.kind==='elite')
  : strategy==='shrine' ? path.some(n=>n.kind==='shrine') : !path.some(n=>['elite','shrine'].includes(n.kind)));

export function farmChapter(chapter, inherited, healer, seed, strategy='normal', eliteChoice=true) {
  const rng=seeded(seed),paths=pathsFor(chapter,strategy),metrics=freshMetrics(),states={};
  let equipment=copy(inherited,healer),wins=0;
  const snapshot=()=>({...gearSnapshot(equipment,healer,chapter.ordinal),owned:[...equipment.ownedIds],wins,metrics:structuredClone(metrics)});
  states.previous=snapshot();
  // Early farming repeats only the first two normal encounters, never a boss or elite.
  const early=pathsFor(chapter,'normal')[0].filter(n=>n.encounter&&n.kind==='normal').slice(0,2);
  for(const node of early) {award(node,equipment,healer,chapter.ordinal,rng,metrics,false);wins++;equipment=copy(equipment,healer);}
  states.early=snapshot();
  const goals={partial:6,veryGood:13,average:18,nearComplete:26};
  const thresholds=()=>{const current=gearSnapshot(equipment,healer,chapter.ordinal).current;
    for(const [key,min] of Object.entries(goals))if(!states[key]&&current>=min)states[key]=snapshot();};
  thresholds();
  for(let run=0;run<100 && !states.nearComplete;run++) {
    const path=paths[Math.floor(rng()*paths.length)];
    for(const node of path.filter(n=>n.encounter)) {
      award(node,equipment,healer,chapter.ordinal,rng,metrics,eliteChoice);wins++;equipment=copy(equipment,healer);thresholds();
      if(states.nearComplete)break;
    }
  }
  // Report the observed high-farm state even if retaining a useful older sidegrade
  // prevents the assignment policy from reaching 26 equipped current items.
  states.nearComplete ||= {...snapshot(),targetReached:false};
  return {states,final:snapshot(),equipment};
}
export function equipmentForSnapshot(state,healer) {
  const equipment=new Equipment();
  // Keep acquired inventory as well as equipped items when progressing onward.
  for(const id of state.owned)equipment.acquire(id);
  return copy(equipment,healer);
}
export function progressionWitness(seed=980000,healer='shaman',strategy='normal',eliteChoice=true) {
  let equipment=recursiveInheritedEquipment(4,healer,'average',seed,seeded(seed)).equipment;
  const chapters=[];
  for(const chapter of CHAPTERS.slice(4)) {
    const farm=farmChapter(chapter,equipment,healer,seed+chapter.ordinal*10000,strategy,eliteChoice);
    const completionState=farm.states.average;
    if(!completionState)throw Error(`No average loadout for Chapter ${chapter.ordinal}`);
    equipment=equipmentForSnapshot(completionState,healer);
    // This assumed completion grants the established normal + Boss Bonus rules.
    const bossMetrics=freshMetrics();
    award(chapter.nodes.at(-1),equipment,healer,chapter.ordinal,seeded(seed+chapter.ordinal*20000),bossMetrics,false);
    equipment=copy(equipment,healer);
    chapters.push({chapter:chapter.ordinal,strategy,states:farm.states,final:farm.final,
      completion:gearSnapshot(equipment,healer,chapter.ordinal),completionRewards:bossMetrics});
  }
  return chapters;
}
export function coverageAudit() {
  return CHAPTERS.slice(4).map(chapter=>{
    const items=GEAR.filter(item=>item.chapter===chapter.ordinal),nonElite=chapter.nodes.filter(n=>n.encounter&&!['elite','boss'].includes(n.kind));
    const preBoss=new Set(nonElite.flatMap(n=>NORMAL_LOOT_TABLES[n.encounter]));
    const pathCoverage=routes(chapter).map((path,index)=>{
      const pool=new Set(path.filter(n=>n.encounter).flatMap(n=>NORMAL_LOOT_TABLES[n.encounter]));
      return {index,nodes:path.map(n=>n.id),combatNodes:path.filter(n=>n.encounter).length,items:pool.size,
        missing:items.filter(i=>!pool.has(i.id)).map(i=>i.id)};
    });
    return {chapter:chapter.ordinal,items:items.length,normalPreBossMissing:items.filter(i=>!preBoss.has(i.id)).map(i=>i.id),
      encounters:chapter.nodes.filter(n=>n.encounter).map(n=>({node:n.id,normal:NORMAL_LOOT_TABLES[n.encounter],
        choice:ELITE_BONUS_LOOT_TABLES[n.encounter]||[],expectedNormalItemsPerVictory:.65,eliteRewardChance:n.kind==='elite'?.6:null})),paths:pathCoverage};
  });
}
export function acquisitionReport(samples=64) {
  if(!Number.isInteger(samples)||samples<1)throw Error('samples must be a positive integer');
  const rows=[],loadouts=[];
  for(const healer of Object.keys(HEALERS))for(const strategy of ['normal','elite','shrine']) {
    const witnesses=Array.from({length:samples},(_,i)=>progressionWitness(acquisitionSeed(i),healer,strategy));
    loadouts.push({healer,strategy,seed:980000,chapters:witnesses[0]});
    for(const chapter of CHAPTERS.slice(4))for(const state of ['previous','early','partial','veryGood','average','nearComplete']) {
      const selected=witnesses.map(w=>w.find(c=>c.chapter===chapter.ordinal).states[state]).filter(Boolean);
      const meanMetric=key=>mean(selected.map(s=>s.metrics[key]));
      rows.push({healer,strategy,chapter:chapter.ordinal,state,reached:selected.length,samples,
        currentSlots:{mean:mean(selected.map(s=>s.current)),min:Math.min(...selected.map(s=>s.current)),max:Math.max(...selected.map(s=>s.current))},
        meanVictories:mean(selected.map(s=>s.wins)),meanNormalGranted:meanMetric('normalGranted'),
        meanNormalRequested:meanMetric('normalRequested'),meanDuplicateGrants:meanMetric('duplicateGrants'),
        meanUnequippedCurrentItems:mean(selected.map(s=>s.unequippedCurrentItems)),
        meanSuppressedExhaustedRewards:mean(selected.map(s=>s.metrics.normalRequested-s.metrics.normalGranted)),
        meanOwnedTableFraction:mean(selected.map(s=>s.metrics.victories?s.metrics.ownedTableFractionSum/s.metrics.victories:0)),
        meanEliteVictories:meanMetric('eliteVictories'),meanEliteSuccessfulRolls:meanMetric('eliteSuccessfulRolls'),
        meanEliteClaims:meanMetric('eliteClaims'),meanEliteSlotGains:meanMetric('eliteSlotGains'),
        roles:Object.fromEntries(Object.keys(selected[0].roles).map(owner=>[owner,{meanCurrent:mean(selected.map(s=>s.roles[owner].current)),
          meanPrevious:mean(selected.map(s=>s.roles[owner].total-s.roles[owner].current)),
          stats:Object.fromEntries(Object.keys(selected[0].roles[owner].stats).map(stat=>[stat,mean(selected.map(s=>s.roles[owner].stats[stat]))]))}])),
        meanStats:Object.fromEntries(['partyHealth','physicalEffectiveHealth','magicEffectiveHealth','companionDps'].map(key=>[key,mean(selected.map(s=>s[key]))])),
        ...(state==='average'?{encounterAcquisition:Object.fromEntries([...new Set(selected.flatMap(s=>Object.keys(s.metrics.byEncounter)))].map(node=>[node,
          Object.fromEntries(['victories','normalGranted','eliteClaims','bossBonus'].map(key=>[key,mean(selected.map(s=>s.metrics.byEncounter[node]?.[key]||0))]))]))}:{}),
      });
    }
  }
  // Paired counterfactual: same elite paths with the choice reward disabled.
  const choiceContribution=[];
  for(const healer of Object.keys(HEALERS)) {
    const disabled=Array.from({length:samples},(_,i)=>progressionWitness(acquisitionSeed(i),healer,'elite',false));
    for(const chapter of CHAPTERS.slice(4)) {
      const on=rows.find(r=>r.healer===healer&&r.strategy==='elite'&&r.chapter===chapter.ordinal&&r.state==='average');
      const off=disabled.map(w=>w.find(c=>c.chapter===chapter.ordinal).states.average);
      choiceContribution.push({healer,chapter:chapter.ordinal,withChoiceMeanVictories:on.meanVictories,withoutChoiceMeanVictories:mean(off.map(s=>s.wins)),meanChoiceClaims:on.meanEliteClaims});
    }
  }
  const capacityGrowth=[];
  for(const healer of Object.keys(HEALERS))for(const seconds of [40,130])for(const chapter of [4,5,6,7,8]) {
    const trials=Array.from({length:8},(_,i)=>capacity(chapter,healer,'new','full',seconds,985000+i));
    capacityGrowth.push({healer,chapter,seconds,healing:mean(trials.map(t=>t.healing)),casts:mean(trials.map(t=>t.casts)),manaRemaining:mean(trials.map(t=>t.remainingMana))});
  }
  return {schemaVersion:1,samples,seedBase:980000,seedStride:104729,slotCount:27,
    method:'Production drop counts/category weights/unowned filtering; normal pre-boss routes, optional elite choice at 60%, unique ownership. Armor assignment maximizes actual effective Health per slot with an exact five-owner matching; role items use established throughput/Mana weights. All victories assumed. Chapter 4 inherited gear uses recursive average Era I farming and real boss rewards. Subsequent inheritance uses the observed 18-slot state plus normal/Boss Bonus, preserving inventory. Targets are stopping states, not boss-clear claims. Capacity is real Combat under unlimited wounds with baseline spells and no talents; EHP uses actual defense formulas.',
    limitations:'No encounter retuning or human win probabilities. Routes count victories, not elapsed combat time; hard elites may cost more time or fail. Choice-disabled paths consume fewer RNG draws, so this compares seeded distributions, not identical drop sequences. Assignment favors mixed Physical/Magic defense (70/30 for tank, 50/50 others), not a universally optimal boss-specific loadout. High-farm diagnostics report actual equipped counts even when older sidegrades remain useful.',
    coverage:coverageAudit(),rows,choiceContribution,capacityGrowth,loadouts:loadouts.map(row=>({...row,chapters:row.chapters.map(chapter=>({
      chapter:chapter.chapter,strategy:chapter.strategy,
      states:Object.fromEntries(Object.entries(chapter.states).map(([key,state])=>[key,{current:state.current,total:27,percent:state.percent,wins:state.wins,
        loadout:state.loadout,owned:state.owned,unequippedCurrentItems:state.unequippedCurrentItems}])),completion:chapter.completion.loadout,
    }))}))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const report=acquisitionReport(Number(process.argv[2]||64));
  writeFileSync(process.argv[3]||'docs/bat-98-acquisition.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({coverage:report.coverage.map(c=>({chapter:c.chapter,normalPreBossMissing:c.normalPreBossMissing,routeMissing:c.paths.map(p=>p.missing)})),
    pace:report.rows.filter(r=>r.healer==='shaman'&&['veryGood','average','nearComplete'].includes(r.state)).map(({chapter,strategy,state,currentSlots,meanVictories,meanEliteClaims})=>({chapter,strategy,state,currentSlots,meanVictories,meanEliteClaims})),choiceContribution:report.choiceContribution}));
}
