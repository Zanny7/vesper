import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, GEAR } from '../src/data.js';
import { NORMAL_LOOT_TABLES, BOSS_BONUS_LOOT_TABLES, eligibleLootPool, normalDropCount, rollNormalLoot, rollBossBonusLoot } from '../src/loot.js';
import { routes, seeded } from '../scripts/boss-balance.mjs';
const sequence=values=>{let i=0;return ()=>values[i++]??0;};
const authoredChapters = CHAPTERS.filter(chapter => GEAR.some(item => item.chapter === chapter.ordinal));
test('every normal encounter offers all four roles without duplicates',()=>{
  for(const [c,chapter] of authoredChapters.entries()) for(const node of chapter.nodes) {
    const table=NORMAL_LOOT_TABLES[node.encounter]; assert.equal(new Set(table).size,table.length);
    const pool=eligibleLootPool(table,[],'priest');assert.equal(pool.length,table.length);
    assert.ok(pool.every(i=>i.chapter===c+1));assert.deepEqual(new Set(pool.map(i=>i.role)),new Set(['healer','all','tank','damage']));
    assert.equal(pool.filter(i=>i.role==='healer').length,1);
    assert.equal(pool.filter(i=>i.role==='all').length,3);
  }
});
test('normal counts preserve 50/35/15 boundaries',()=>{
  for(const [roll,count] of [[0,0],[.499999,0],[.5,1],[.849999,1],[.85,2],[.999999,2]]) assert.equal(normalDropCount(()=>roll),count);
});
test('normal and boss category boundaries are intentional and independent of item count',()=>{
  const table=['healer','all','tank','damage'].map(role=>GEAR.find(i=>i.role===role).id);
  const roleAt=roll=>rollNormalLoot(table,[],'shaman',sequence([.5,roll,0]))[0].role;
  for(const [boundary,below,at] of [[.3,'healer','all'],[.6,'all','tank'],[.775,'tank','damage']]) {
    assert.equal(roleAt(boundary-.000001),below);assert.equal(roleAt(boundary),at);assert.equal(roleAt(boundary+.000001),at);
    assert.equal(rollBossBonusLoot(table,[],'druid',sequence([boundary,0]))[0].role,at);
  }
  assert.equal(roleAt(1),'damage');
});
test('owned and repeated ids are filtered and two-drop rolls cannot duplicate',()=>{
  const table=NORMAL_LOOT_TABLES.sentinel;
  const keep=table[0], owned=table.slice(1);
  assert.deepEqual(rollNormalLoot([...table,keep],owned,'priest',sequence([.85,0,0,0,0])).map(i=>i.id),[keep]);
  assert.deepEqual(rollNormalLoot(table,table,'priest',sequence([.85])),[]);
});
test('every route offers each healer throughput slot identically',()=>{
  for(const chapter of authoredChapters) for(const route of routes(chapter)) {
    const pools=['priest','druid','shaman'].map(healer=>route.flatMap(node=>eligibleLootPool(NORMAL_LOOT_TABLES[node.encounter],[],healer)).map(i=>i.id));
    assert.deepEqual(pools[0],pools[1]);assert.deepEqual(pools[0],pools[2]);
    for(const slot of ['Weapon','Tome','Trinket']) assert.ok(pools[0].some(id=>GEAR.find(i=>i.id===id && i.role==='healer' && i.slot===slot)));
  }
});
test('boss bonus remains chapter-local, outside boss normal pool, one guaranteed unowned reward',()=>{
  for(const [c,chapter] of authoredChapters.entries()) {
    const boss=chapter.nodes.find(n=>n.kind==='boss'), table=BOSS_BONUS_LOOT_TABLES[boss.encounter];
    assert.ok(table.length);assert.ok(table.every(id=>GEAR.find(i=>i.id===id).chapter===c+1));
    assert.ok(table.every(id=>!NORMAL_LOOT_TABLES[boss.encounter].includes(id)));
    assert.equal(rollBossBonusLoot(table,[],'shaman',()=>0).length,1);
    assert.deepEqual(rollBossBonusLoot(table,table,'shaman'),[]);
    const available=new Set([...chapter.nodes.flatMap(n=>NORMAL_LOOT_TABLES[n.encounter]),...table]);
    for(const item of GEAR.filter(i=>i.chapter===c+1)) assert.ok(available.has(item.id),item.id);
  }
});
test('seeded rolls match declared category weights within one percentage point',()=>{
  const table=GEAR.filter(i=>i.chapter===4).map(i=>i.id),random=seeded(92000),counts={healer:0,all:0,tank:0,damage:0};
  for(let i=0;i<20000;i++) counts[rollBossBonusLoot(table,[],'shaman',random)[0].role]++;
  for(const [role,weight] of Object.entries({healer:.3,all:.3,tank:.175,damage:.225})) assert.ok(Math.abs(counts[role]/20000-weight)<.01);
});
