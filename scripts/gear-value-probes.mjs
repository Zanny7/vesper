// BAT-92: fixed-seed, real Combat probes; never changes encounters or saves.
// node scripts/gear-value-probes.mjs [samples=30] > docs/bat-92-gear-value.json
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { GEAR, CHAPTERS, CHAPTER_ENCOUNTERS, HEALERS, partyForHealer } from '../src/data.js';
import { Combat } from '../src/combat.js';
import { Equipment } from '../src/gear.js';
import { controlledEncounter, simulate } from './shaman-balance.mjs';
import { seeded, routes, acquireRoute, regeared } from './boss-balance.mjs';
import { NORMAL_LOOT_TABLES, BOSS_BONUS_LOOT_TABLES, rollNormalLoot, rollBossBonusLoot } from '../src/loot.js';
import { sampleGearProgression } from './shaman-gear-progression.mjs';

const oldGear=JSON.parse(readFileSync(new URL('./fixtures/bat91-gear.json',import.meta.url),'utf8'));
const slots=['Weapon','Tome','Trinket'];
const round=n=>Math.round(n*1000)/1000;
const mean=(rows,key)=>round(rows.reduce((s,r)=>s+r[key],0)/rows.length);
export function throughputItems(chapter,healer,version='new',variant=0) {
  return slots.map(slot=>{
    const pool=(version==='new'?GEAR:oldGear).filter(i=>i.chapter===chapter && i.slot===slot && (version==='new'?i.role==='healer':i.owner===healer));
    return pool[variant]||pool[0];
  });
}
function apply(party,items) {
  return party.map(member=>member.label!=='HEALER'?{...member}:items.reduce((out,item)=>{
    for(const [key,value] of Object.entries(item.stats)) out[key]=(out[key]||0)+value;
    return out;
  },{...member}));
}
// Real cast/cooldown/HoT/crit/haste/Mana rules under an unlimited wound workload.
// Artificial wounds are a capacity assay, not an encounter difficulty claim.
export function capacity(chapter,healer,version,slot,seconds,seed,variant=0) {
  const items=throughputItems(chapter,healer,version,variant).filter(i=>slot==='full'||i.slot===slot);
  const game=new Combat({name:'Capacity assay',maxHp:1e8,adds:[],strike:{first:Infinity,every:Infinity,damage:0},mechanics:[]},seeded(seed),apply(partyForHealer(healer),items),HEALERS[healer].combatSpells);
  game.start();
  const primary={priest:'flash',druid:'nourish',shaman:'healingWave'}[healer];
  let count=0,spent=0,depletedAt=null;
  while(game.status==='running' && game.time<seconds-1e-8) {
    // Keep recipient wounds large while preserving actual health maxima.
    game.party.forEach(member=>{member.hp=1;});
    if(!game.cast) {
      const resolved=game.resolveCast(game.spells.find(s=>s.id===primary));
      if(game.begin(primary,'tank').ok) {count++;spent+=resolved.cost;}
      else if(depletedAt===null) depletedAt=game.time;
    }
    game.step();game.drainEvents();
  }
  return {healing:game.stats.effective,casts:count,spent,remainingMana:game.mana,depletedAt:depletedAt??seconds};
}

export function valueReport(samples=30) {
  if(!Number.isInteger(samples)||samples<1) throw Error('samples must be a positive integer');
  const distributions=[],capacityRows=[],encounters=[],persistentRoutes=[];
  for(const chapter of [1,2,3,4]) for(const healer of Object.keys(HEALERS)) {
    const baseParty=partyForHealer(healer);
    for(const version of ['old','new']) {
      const items=throughputItems(chapter,healer,version);
      distributions.push({chapter,healer,version,items:items.map(i=>({id:i.id,slot:i.slot,stats:i.stats}))});
      for(const seconds of [40,75,130]) for(const slot of ['none',...slots,'full']) {
        const rows=Array.from({length:samples},(_,i)=>capacity(chapter,healer,version,slot,seconds,920000+i));
        capacityRows.push({chapter,healer,version,seconds,slot,...Object.fromEntries(['healing','casts','spent','remainingMana','depletedAt'].map(k=>[k,mean(rows,k)]))});
      }
      // Existing chapter boss and split/attrition workload, using the same base
      // defenses/DPS for each slot so combat contribution can be attributed.
      const boss=CHAPTERS[chapter-1].nodes.find(n=>n.kind==='boss');
      for(const [profile,encounter,seconds] of [
        ['boss',CHAPTER_ENCOUNTERS[boss.encounter],150],
        ['medium',controlledEncounter(chapter,'attrition'),75],
        ['long',controlledEncounter(chapter,'attrition'),130],
      ]) for(const slot of ['none',...slots,'full']) {
        const party=apply(baseParty,items.filter(i=>slot==='full'||i.slot===slot));
        const rows=Array.from({length:samples},(_,i)=>simulate(encounter,party,healer,{},921000+i,null,{seconds}));
        encounters.push({chapter,healer,version,profile,slot,seconds:mean(rows,'seconds'),completion:mean(rows,'won'),survival:mean(rows,'survived'),effective:mean(rows,'effective'),rawHealing:mean(rows,'rawHealing'),spent:mean(rows,'manaSpent'),remainingMana:mean(rows,'remainingMana'),deaths:mean(rows,'deaths'),
          casts:rows[0].casts});
      }
      // Same route and same combat policy; carry resources, grant no loot here.
      const path=routes(CHAPTERS[chapter-1])[0];
      for(const slot of ['none',...slots,'full']) {
        const rows=Array.from({length:samples},(_,i)=>{
          const party=apply(baseParty,items.filter(item=>slot==='full'||item.slot===slot));
          let resources=null,spent=0,healing=0,seconds=0,completed=0;
          for(const node of [...path,boss]) {
            const r=simulate(CHAPTER_ENCOUNTERS[node.encounter],party,healer,{},922000+i,resources);
            resources=r.resources;spent+=r.manaSpent;healing+=r.effective;seconds+=r.seconds;
            if(!r.won) break;completed++;
          }
          return {completed,spent,healing,seconds,remainingMana:resources.mana.current};
        });
        persistentRoutes.push({chapter,healer,version,slot,...Object.fromEntries(['completed','spent','healing','seconds','remainingMana'].map(k=>[k,mean(rows,k)]))});
      }
    }
  }
  // Actual loot and role assignment over 3 farmed routes + approach + boss.
  const loot=[];
  for(const chapter of CHAPTERS) for(const healer of Object.keys(HEALERS)) {
    const counts={healer:0,all:0,tank:0,damage:0};let distinct=0,bonusCount=0;
    for(let i=0;i<samples;i++) {
      const equipment=new Equipment(),random=seeded(923000+i),paths=routes(chapter),boss=chapter.nodes.find(n=>n.kind==='boss');
      for(let clear=0;clear<4;clear++) acquireRoute(chapter,paths[Math.floor(random()*paths.length)],equipment,healer,random);
      for(const item of rollNormalLoot(NORMAL_LOOT_TABLES[boss.encounter],equipment.ownedIds,healer,random)) equipment.acquire(item.id);
      const bonus=rollBossBonusLoot(BOSS_BONUS_LOOT_TABLES[boss.encounter],equipment.ownedIds,healer,random);bonusCount+=bonus.length;
      for(const item of bonus) equipment.acquire(item.id);
      for(const item of equipment.collection()) counts[item.role]++;
      distinct+=equipment.ownedIds.size;
      const geared=regeared(equipment,healer),used=Object.values(geared.equipped).flatMap(Object.values);
      if(new Set(used).size!==used.length) throw Error('duplicate assignment');
    }
    loot.push({chapter:CHAPTERS.indexOf(chapter)+1,healer,meanOwned:round(distinct/samples),meanBonusCount:round(bonusCount/samples),roles:Object.fromEntries(Object.entries(counts).map(([r,n])=>[r,round(n/samples)]))});
  }
  return {samples,seeds:{capacity:920000,encounters:921000,routes:922000,loot:923000,secondaryMixed:924000},method:'Baseline spells, no talents; unchanged production bosses/routes and controlled attrition profile. Capacity assay uses actual Combat under unlimited wounds; it is not encounter tuning. Isolated slot ablations use the same base party, no gear grants or refills between route fights. Loot progression separately assumes victories.',distributions,capacity:capacityRows,secondaryChoices:secondaryChoiceReport(samples),encounters,persistentRoutes,loot,progression:sampleGearProgression(Math.max(256,samples))};
}
export function secondaryChoiceReport(samples=30) {
  const rows=[];
  for(const chapter of [3,4]) for(const healer of Object.keys(HEALERS)) for(const slot of slots) for(const seconds of [40,75,130]) {
    const choices=[0,1].map(variant=>{
      const trials=Array.from({length:samples},(_,i)=>capacity(chapter,healer,'new',slot,seconds,920000+i,variant));
      const items=throughputItems(chapter,healer,'new',variant).filter(i=>i.slot===slot);
      const mixed=Array.from({length:samples},(_,i)=>simulate(controlledEncounter(chapter,'attrition'),apply(partyForHealer(healer),items),healer,{},924000+i,null,{seconds}));
      return {id:items[0].id,healing:mean(trials,'healing'),remainingMana:mean(trials,'remainingMana'),mixed:{survival:mean(mixed,'survived'),seconds:mean(mixed,'seconds'),effective:mean(mixed,'effective'),manaSpent:mean(mixed,'manaSpent'),remainingMana:mean(mixed,'remainingMana')}};
    });
    rows.push({chapter,healer,slot,seconds,choices,ratio:round(choices[1].healing/choices[0].healing)});
  }
  return rows;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(valueReport(Number(process.argv[2]||30)),null,2));
