import test from 'node:test';
import assert from 'node:assert/strict';
import { GEAR, GEAR_ID_MIGRATIONS } from '../src/data.js';
import { Equipment } from '../src/gear.js';
import { canEquipItem } from '../src/item-model.js';
const disk=()=>{const values=new Map();return {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};};
const locations=gear=>[...gear.bagSlots.filter(Boolean),...Object.values(gear.equipped).flatMap(slots=>Object.values(slots))];
test('all obsolete healer ids migrate deterministically in inventory, bag and equipment',()=>{
  for(const version of [2,3,4]) for(const [old,id] of Object.entries(GEAR_ID_MIGRATIONS)) {
    const storage=disk(), item=GEAR.find(i=>i.id===id);
    storage.setItem('vesper-equipment-v2',JSON.stringify({version,owned:[old,id,old,'missing'],bag:[old,id,old],equipped:{shaman:{[item.slot]:old},priest:{[item.slot]:id}}}));
    const gear=new Equipment(storage);
    assert.deepEqual([...gear.ownedIds],[id]); assert.deepEqual(locations(gear),[id]);
    assert.equal(gear.item({id:'shaman'},item.slot).id,id);
    assert.deepEqual(new Equipment(storage).equipped,gear.equipped);
    assert.equal(JSON.parse(storage.getItem('vesper-equipment-v2')).version,4);
  }
});
test('invalid new role assignments return to bag without losing ownership or duplicating bag ids',()=>{
  const storage=disk(), id='ch4-lion-of-the-empty-throne';
  storage.setItem('vesper-equipment-v2',JSON.stringify({version:2,owned:[id],bag:[id,id],equipped:{priest:{Trinket:id}}}));
  const gear=new Equipment(storage); assert.equal(gear.item({id:'priest'},'Trinket'),null);
  assert.deepEqual(locations(gear),[id]); assert.equal(gear.equip({id:'tank'},'Trinket',id),true);
});
test('migration prefers the selected healer when obsolete ids collapse to one item',()=>{
  const storage=disk(); storage.setItem('vesper-active-healer-v1','shaman');
  storage.setItem('vesper-equipment-v2',JSON.stringify({version:2,owned:['ch1-sepulcher-candle','ch1-gravewater-conduit'],equipped:{priest:{Weapon:'ch1-sepulcher-candle'},shaman:{Weapon:'ch1-gravewater-conduit'}}}));
  const gear=new Equipment(storage);
  assert.equal(gear.item({id:'shaman'},'Weapon').id,'ch1-sepulcher-candle');
  assert.equal(gear.item({id:'priest'},'Weapon'),null);assert.equal(locations(gear).length,1);
});
test('shared gear moves between healers once; displaced items return to inventory; locks apply',()=>{
  const storage=disk();let locked=false;const gear=new Equipment(storage,()=>locked);
  const first=GEAR.find(i=>i.chapter===3 && i.role==='healer' && i.slot==='Weapon');
  const second=GEAR.find(i=>i.chapter===4 && i.role==='healer' && i.slot==='Weapon');
  gear.acquire(first.id);gear.acquire(second.id);
  gear.equip({id:'shaman'},'Weapon',first.id);gear.equip({id:'druid'},'Weapon',second.id);
  assert.equal(gear.equip({id:'priest'},'Weapon',first.id),false);
  locked=true;assert.equal(gear.switchHealer('shaman','druid'),false);locked=false;
  assert.equal(gear.switchHealer('shaman','druid'),true);
  assert.equal(gear.item({id:'shaman'},'Weapon'),null);
  assert.equal(gear.item({id:'druid'},'Weapon').id,first.id);
  assert.ok(gear.bagSlots.includes(second.id));
  gear.switchHealer('druid','priest');
  assert.equal(gear.item({id:'priest'},'Weapon').id,first.id);
  assert.equal(new Set(locations(gear)).size,2);
  assert.deepEqual(new Equipment(storage).equipped,gear.equipped);
});
test('universal armor can fill every party slot from distinct owned variants',()=>{
  const gear=new Equipment();
  for(const slot of ['Head','Chest','Legs']) for(const [index,id] of ['shaman','tank','rogue','mage','ranger'].entries()) {
    const item=GEAR.filter(i=>i.chapter===4 && i.role==='all' && i.slot===slot)[index];
    assert.ok(canEquipItem(id,slot,item));gear.acquire(item.id);assert.ok(gear.equip({id},slot,item.id));
  }
  assert.equal(locations(gear).length,15); assert.equal(new Set(locations(gear)).size,15);
});
test('shared item swap and equipment-to-bag movement preserve one location through reload',()=>{
  const storage=disk(),gear=new Equipment(storage),id='ch4-thornlit-testament',other='ch4-briarqueen-herbarium';
  gear.acquire(id);gear.acquire(other);gear.equip({id:'priest'},'Tome',id);
  assert.equal(gear.equip({id:'priest'},'Tome',other),true);assert.ok(gear.bagSlots.includes(id));
  assert.equal(gear.unequipToBag({id:'priest'},'Tome',10),true);assert.equal(gear.bagSlots[10],other);
  assert.equal(gear.equip({id:'tank'},'Tome',other),false);
  assert.equal(gear.equip({id:'shaman'},'Tome',other),true);assert.equal(gear.bagSlots[10],null);
  const restored=new Equipment(storage);assert.equal(locations(restored).length,2);assert.equal(new Set(locations(restored)).size,2);
  assert.equal(restored.discard(other),false);assert.equal(restored.discard(id),true);assert.equal(locations(restored).length,1);
});
