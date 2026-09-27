import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GEAR, GEAR_CHAPTER_BANDS } from '../src/data.js';
import { ITEM_OWNERS, slotsForOwner, validateCatalogue, canEquipItem, averageItemLevel } from '../src/item-model.js';
import { Equipment } from '../src/gear.js';
import { itemIcon, itemDetails } from '../src/equipment.js';
test('Chapters 1–4 cover every character slot with valid roles and metadata',()=>{
  assert.deepEqual(validateCatalogue(GEAR),[]); assert.equal(GEAR.length,138);
  assert.equal(new Set(GEAR.map(i=>i.name)).size,GEAR.length);
  for(const chapter of [1,2,3,4]) for(const owner of ITEM_OWNERS) {
    const gear=new Equipment();
    for(const slot of slotsForOwner(owner)) {
      const item=GEAR.find(i=>i.chapter===chapter && canEquipItem(owner,slot,i));
      assert.ok(item); gear.acquire(item.id); assert.ok(gear.equip({id:owner},slot,item.id));
    }
    const average=averageItemLevel({id:owner},gear.equipped);
    assert.ok(average>=chapter*3-2 && average<=chapter*3);
  }
  for(const item of GEAR) {
    const [min,max]=GEAR_CHAPTER_BANDS[item.chapter]; assert.ok(item.itemLevel>=min && item.itemLevel<=max);
    assert.match(item.id,/^ch[1-4]-/); assert.ok(item.flavor.length>15);
  }
});
test('icons are distinct local illustrations and details display eligibility',()=>{
  const drawings=new Set();
  for(const item of GEAR) {
    const svg=readFileSync(new URL(`..${item.icon}`,import.meta.url),'utf8');
    assert.match(svg,/viewBox="0 0 64 64"/); assert.ok(!/<script|<image|href=/.test(svg));
    drawings.add(svg.replace(/<title>.*?<\/title>/,''));
    assert.ok(itemIcon(item).includes(item.icon)); assert.match(itemDetails(item),/Role: (All|Healer|Tank|Damage)/);
  }
  assert.equal(drawings.size,GEAR.length);
});
test('universal armor budgets are disciplined and Chest is strongest',()=>{
  const score=i=>(i.stats.maxHp||0)/10+(i.stats.armor||0)+(i.stats.resistance||0);
  for(const chapter of [1,2,3,4]) {
    const armor=GEAR.filter(i=>i.chapter===chapter && i.role==='all'); assert.equal(armor.length,21);
    for(const item of armor) {
      assert.equal(item.owner,undefined); assert.ok(Object.keys(item.stats).every(s=>['maxHp','armor','resistance'].includes(s)));
      for(const owner of ITEM_OWNERS) assert.ok(canEquipItem(owner,item.slot,item));
    }
    assert.ok(Math.min(...armor.filter(i=>i.slot==='Chest').map(score))>Math.max(...armor.filter(i=>i.slot!=='Chest').map(score)));
  }
});
test('healer slots have differentiated, shared progression and modest secondary choices',()=>{
  let prior={spellPower:0,maxMana:0,manaRegen:0};
  for(const chapter of [1,2,3,4]) {
    const items=GEAR.filter(i=>i.chapter===chapter && i.role==='healer');
    const bySlot=Object.fromEntries(['Weapon','Tome','Trinket'].map(slot=>[slot,items.filter(i=>i.slot===slot)]));
    for(const stat of Object.keys(prior)) {
      const order=stat==='spellPower'?['Weapon','Tome','Trinket']:stat==='maxMana'?['Tome','Weapon','Trinket']:['Trinket','Tome','Weapon'];
      for(let n=0;n<2;n++) assert.ok(Math.min(...bySlot[order[n]].map(i=>i.stats[stat]))>Math.max(...bySlot[order[n+1]].map(i=>i.stats[stat])));
      const total=Object.values(bySlot).reduce((sum,pool)=>sum+pool[0].stats[stat],0); assert.ok(total>prior[stat]); prior[stat]=total;
    }
    for(const pool of Object.values(bySlot)) {
      assert.equal(pool.length,chapter<3?1:2);
      if(chapter>=3) {assert.ok(pool.some(i=>i.stats.haste));assert.ok(pool.some(i=>i.stats.crit));}
    }
    for(const item of items) {
      assert.equal(item.owner,undefined);
      for(const healer of ['priest','druid','shaman']) assert.ok(canEquipItem(healer,item.slot,item));
      assert.ok(!['maxHp','armor','resistance'].some(s=>s in item.stats));
    }
  }
});
test('Tank and Damage slots reject cross-role equips and illegal stats',()=>{
  for(const item of GEAR.filter(i=>['tank','damage'].includes(i.role))) {
    if(item.role==='tank' && item.slot!=='Weapon') {
      assert.ok(Object.keys(item.stats).every(s=>['maxHp','armor','resistance'].includes(s)));
      if(item.slot==='Shield') assert.ok(item.stats.armor>(item.stats.resistance||0) && item.stats.armor>item.stats.maxHp/10);
    } else assert.deepEqual(Object.keys(item.stats),['damage']);
    for(const healer of ['priest','druid','shaman']) assert.equal(canEquipItem(healer,item.slot,item),false);
    if(item.role==='damage' && item.slot==='Trinket') for(const id of ['rogue','mage','ranger']) assert.ok(canEquipItem(id,'Trinket',item));
  }
  for(const bad of [{...GEAR[0],stats:{maxHp:5}},{...GEAR[0],role:'all'},{...GEAR[0],stats:{haste:10}}]) assert.ok(validateCatalogue([bad]).length);
});
