import test from 'node:test';
import assert from 'node:assert/strict';
import { GEAR, HEALERS, SLOTS } from '../src/data.js';
import { Equipment } from '../src/gear.js';
import { canEquipItem } from '../src/item-model.js';
import { auditGearParity } from '../scripts/gear-parity.mjs';
import { regeared } from '../scripts/boss-balance.mjs';
import { sampleGearProgression } from '../scripts/shaman-gear-progression.mjs';
test('all healers have identical catalogue and route/boss opportunities',()=>{
  for(const chapter of auditGearParity()) {
    assert.deepEqual(chapter.companionDifferences,[]);
    for(const slot of SLOTS.healer) {
      assert.ok(chapter.healer.shaman[slot].authored.length);
      assert.deepEqual(chapter.healer.shaman[slot],chapter.healer.priest[slot]);
      assert.deepEqual(chapter.healer.shaman[slot],chapter.healer.druid[slot]);
    }
  }
});
test('progression sampler equips actual shared gear without duplicate assignments',()=>{
  for(const healer of Object.keys(HEALERS)) {
    const equipment=new Equipment();
    for(const item of GEAR.filter(i=>i.role==='healer' && i.chapter===4)) equipment.acquire(item.id);
    const geared=regeared(equipment,healer);
    for(const slot of ['Weapon','Tome','Trinket']) assert.ok(geared.item({id:healer},slot));
    assert.ok(geared.healer(healer).spellPower>=49);
  }
  const rows=sampleGearProgression(2).rows;
  for(const row of rows) {
    const used=Object.values(row.representative.loadout).flatMap(slots=>Object.values(slots)); assert.equal(new Set(used).size,used.length);
    for(const [owner,slots] of Object.entries(row.representative.loadout)) for(const [slot,id] of Object.entries(slots)) assert.ok(canEquipItem(owner,slot,GEAR.find(i=>i.id===id)));
  }
  for(const row of rows.filter(r=>r.healer==='priest')) for(const healer of ['druid','shaman']) {
    const peer=rows.find(r=>r.healer===healer && r.chapter===row.chapter && r.clears===row.clears);
    assert.deepEqual(peer.meanStats,row.meanStats); assert.deepEqual(peer.slotOccupancy,row.slotOccupancy);
  }
});
