import test from 'node:test';
import assert from 'node:assert/strict';
import { GEAR, CHAPTERS } from '../src/data.js';
import { NORMAL_LOOT_TABLES, BOSS_BONUS_LOOT_TABLES, eligibleLootPool } from '../src/loot.js';
import { encounterLootMarkup } from '../src/loot-presentation.js';
import { itemDetails, itemComparison } from '../src/equipment.js';
test('every boss advertises exactly the eligible normal and bonus pools separately',()=>{
  for(const chapter of CHAPTERS) {
    const boss=chapter.nodes.find(n=>n.kind==='boss');
    const normal=eligibleLootPool(NORMAL_LOOT_TABLES[boss.encounter],[],'shaman');
    const bonus=eligibleLootPool(BOSS_BONUS_LOOT_TABLES[boss.encounter],[],'shaman');
    const html=encounterLootMarkup(normal,bonus,true);
    assert.equal((html.match(/data-item-id=/g)||[]).length,normal.length+bonus.length);
    assert.equal((html.match(/class="boss-bonus-badge"/g)||[]).length,bonus.length);
    for(const item of [...normal,...bonus]) assert.ok(html.includes(`data-item-id="${item.id}"`));
    assert.ok(!html.includes('Exclusive'));assert.match(html,/One additional unowned reward/);
  }
  assert.ok(!encounterLootMarkup([GEAR[0]]).includes('Boss Bonus'));
  assert.match(encounterLootMarkup([],[],true),/All eligible boss bonus rewards are owned/);
});
test('item details label the role and comparisons include removed stats and secondary units',()=>{
  assert.match(itemDetails(GEAR[0]),/Role: Healer/);
  const a={stats:{spellPower:17,haste:2}}, b={stats:{spellPower:23,crit:2.5}};
  assert.equal(itemComparison(a,b),'-6 Spell Power · +2% Haste · -2.5% Crit');
  assert.equal(itemComparison({stats:{manaRegen:.25}},{stats:{manaRegen:.2}}),'+0.05 Mana regeneration');
});
