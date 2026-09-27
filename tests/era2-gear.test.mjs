import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHAPTERS, GEAR, ERA2_ELITE_LOOT_TABLES } from '../src/data.js';
import { Equipment } from '../src/gear.js';
import { canEquipItem, validateCatalogue } from '../src/item-model.js';
import { NORMAL_LOOT_TABLES, BOSS_BONUS_LOOT_TABLES, rollEliteRewardChoice } from '../src/loot.js';
import { itemEraLabel, itemBorderAttributes } from '../src/eras.js';
import { clearVesperLocalState } from '../src/hard-reset.js';
import { coverageAudit, progressionWitness } from '../scripts/era2-gear.mjs';

const disk=()=>{const values=new Map();return {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
const encounter=CHAPTERS[4].nodes.find(node=>node.kind==='elite').encounter;

test('Era I items remain exactly equal to the established BAT-94 snapshot',()=>{
  const baseline=JSON.parse(readFileSync(new URL('../scripts/fixtures/bat94-pressure.json',import.meta.url)));
  assert.deepEqual(GEAR.filter(item=>item.chapter<=4),baseline.gear);
  assert.deepEqual(validateCatalogue(GEAR),[]);
});

test('Era II catalogues fill 27 unique party slots and preserve every role identity',()=>{
  for(const chapter of CHAPTERS.slice(4)) {
    const items=GEAR.filter(item=>item.chapter===chapter.ordinal);
    assert.equal(items.length,27);
    for(const item of items) {
      assert.equal(itemEraLabel(item),'Era II');assert.match(itemBorderAttributes(item),/#78be87/);
      if(item.role==='all') for(const owner of ['priest','druid','shaman','tank','rogue','mage','ranger'])assert.ok(canEquipItem(owner,item.slot,item));
    }
    const [weapon,tome,trinket]=['Weapon','Tome','Trinket'].map(slot=>items.find(item=>item.role==='healer'&&item.slot===slot));
    assert.ok(weapon.stats.spellPower>tome.stats.spellPower&&tome.stats.spellPower>trinket.stats.spellPower);
    assert.ok(tome.stats.maxMana>weapon.stats.maxMana&&weapon.stats.maxMana>trinket.stats.maxMana);
    assert.ok(trinket.stats.manaRegen>tome.stats.manaRegen&&tome.stats.manaRegen>weapon.stats.manaRegen);
  }
});

test('every legal pre-boss route covers the entire catalogue, including routes that skip elites',()=>{
  for(const chapter of coverageAudit()) {
    assert.deepEqual(chapter.normalPreBossMissing,[]);
    for(const path of chapter.paths)assert.deepEqual(path.missing,[],path.nodes.join(','));
    for(const {node,choice} of chapter.encounters)if(choice.length) {
      assert.equal(choice.length,6);
      for(const id of choice)assert.ok(CHAPTERS.find(c=>c.ordinal===chapter.chapter).nodes.some(n=>n.kind==='normal'&&NORMAL_LOOT_TABLES[n.encounter].includes(id)));
      assert.equal(BOSS_BONUS_LOOT_TABLES[node],undefined);
    }
  }
});

test('elite probability boundaries expose all unowned compatible choices and never randomly award one',()=>{
  for(const healer of ['priest','druid','shaman']) {
    for(const roll of [0,.599999]) {
      const reward=rollEliteRewardChoice(encounter,[],healer,()=>roll);
      assert.equal(reward.succeeded,true);assert.equal(reward.items.length,6);
      assert.deepEqual(reward.items.map(item=>item.id),ERA2_ELITE_LOOT_TABLES[encounter]);
    }
    for(const roll of [.6,.999999])assert.deepEqual(rollEliteRewardChoice(encounter,[],healer,()=>roll),{succeeded:false,items:[]});
    assert.deepEqual(rollEliteRewardChoice(encounter,ERA2_ELITE_LOOT_TABLES[encounter],healer,()=>0),{succeeded:true,items:[]});
  }
});

test('an elite victory can grant one selected item across save/reload, replay and hard reset',()=>{
  const storage=disk(),equipment=new Equipment(storage),roll=rollEliteRewardChoice(encounter,[],'shaman',()=>0);
  assert.ok(equipment.recordEliteReward('attempt-1',encounter,roll));
  assert.equal(equipment.ownedIds.size,0);
  let loaded=new Equipment(storage);
  assert.equal(loaded.pendingEliteRewards()[0].items.length,6);
  assert.equal(loaded.recordEliteReward('attempt-1',encounter,roll),false);
  assert.equal(loaded.claimEliteReward('attempt-1',GEAR[0].id),null);
  const chosen=roll.items.at(-1);
  assert.equal(loaded.claimEliteReward('attempt-1',chosen.id).id,chosen.id);
  assert.equal(loaded.bagSlots.filter(id=>id===chosen.id).length,1);
  loaded=new Equipment(storage);
  assert.ok(loaded.owns(chosen.id));assert.equal(loaded.pendingEliteRewards().length,0);
  assert.equal(loaded.claimEliteReward('attempt-1',roll.items[0].id),null);
  assert.equal(loaded.recordEliteReward('attempt-1',encounter,roll),false);
  assert.ok(loaded.recordEliteReward('attempt-2',encounter,rollEliteRewardChoice(encounter,loaded.ownedIds,'priest',()=>0)));
  assert.equal(loaded.pendingEliteRewards()[0].items.length,5);
  assert.ok(clearVesperLocalState(storage).ok);
  loaded=new Equipment(storage);assert.equal(loaded.ownedIds.size,0);assert.equal(loaded.pendingEliteRewards().length,0);
});

test('failed/exhausted rolls remain spent and malformed pending references are discarded',()=>{
  const storage=disk(),equipment=new Equipment(storage);
  equipment.recordEliteReward('failed',encounter,rollEliteRewardChoice(encounter,[],'druid',()=>.6));
  equipment.recordEliteReward('empty',encounter,rollEliteRewardChoice(encounter,ERA2_ELITE_LOOT_TABLES[encounter],'druid',()=>0));
  const loaded=new Equipment(storage);
  assert.deepEqual(loaded.pendingEliteRewards(),[]);
  assert.equal(loaded.recordEliteReward('failed',encounter,rollEliteRewardChoice(encounter,[],'druid',()=>0)),false);
  storage.setItem('vesper-equipment-v2',JSON.stringify({version:5,owned:[],eliteRewards:{orphan:{encounter:'missing',status:'pending',choices:['missing']},invalid:{encounter,status:'pending',choices:[GEAR[0].id]}}}));
  assert.equal(new Equipment(storage).pendingEliteRewards().length,0);
});

test('claimed choices are atomic with inventory and owned/locked selections cannot consume pending rewards',()=>{
  const storage=disk(),equipment=new Equipment(storage),roll=rollEliteRewardChoice(encounter,[],'priest',()=>0);
  equipment.recordEliteReward('victory',encounter,roll);
  const locked=new Equipment(storage,()=>true);
  assert.equal(locked.claimEliteReward('victory',roll.items[0].id),null);
  equipment.acquire(roll.items[0].id);
  assert.equal(equipment.claimEliteReward('victory',roll.items[0].id),null);
  assert.equal(equipment.pendingEliteRewards()[0].items.length,5);
  assert.ok(equipment.claimEliteReward('victory',roll.items[1].id));
  const saved=JSON.parse(storage.getItem('vesper-equipment-v2'));
  assert.ok(saved.owned.includes(roll.items[1].id));assert.equal(saved.eliteRewards.victory.status,'claimed');
  const all=new Equipment();all.recordEliteReward('all',encounter,roll);roll.items.forEach(i=>all.acquire(i.id));
  assert.ok(all.dismissExhaustedEliteReward('all'));assert.equal(all.pendingEliteRewards().length,0);
});

test('real acquisition yields legal equipped 13/18-slot witnesses with previous-chapter inheritance',()=>{
  for(const chapter of progressionWitness()) {
    assert.ok(chapter.states.veryGood.current>=11&&chapter.states.veryGood.current<=15);
    assert.ok(chapter.states.average.current>=15&&chapter.states.average.current<=20);
    assert.equal(chapter.states.previous.current,0);
    for(const state of Object.values(chapter.states)) {
      const used=Object.values(state.loadout).flatMap(Object.values);
      assert.equal(new Set(used).size,used.length);assert.ok(used.length<=27);
      for(const [owner,slots] of Object.entries(state.loadout))for(const [slot,id] of Object.entries(slots))assert.ok(canEquipItem(owner,slot,GEAR.find(i=>i.id===id)));
    }
  }
});
