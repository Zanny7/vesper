import test from 'node:test';
import assert from 'node:assert/strict';
import { GEAR, CHAPTERS } from '../src/data.js';
import { NORMAL_LOOT_TABLES, BOSS_BONUS_LOOT_TABLES, eligibleLootPool } from '../src/loot.js';
import { encounterLootMarkup } from '../src/loot-presentation.js';
import { itemDetails, itemComparison } from '../src/equipment.js';
test('boss previews hide the bonus pool behind one accessible mystery tile',()=>{
  for(const chapter of CHAPTERS) {
    const boss=chapter.nodes.find(n=>n.kind==='boss');
    const normal=eligibleLootPool(NORMAL_LOOT_TABLES[boss.encounter],[],'shaman');
    const bonus=eligibleLootPool(BOSS_BONUS_LOOT_TABLES[boss.encounter],[],'shaman');
    const html=encounterLootMarkup(normal,bonus,true);
    assert.equal((html.match(/data-item-id=/g)||[]).length,normal.length);
    assert.equal((html.match(/class="loot-reward boss-bonus-reward"/g)||[]).length,1);
    assert.equal((html.match(/class="loot-reward(?: |\")/g)||[]).length,normal.length+1);
    for(const item of normal) assert.ok(html.includes(`data-item-id="${item.id}"`));
    for(const item of bonus) assert.ok(!html.includes(`data-item-id="${item.id}"`));
    assert.match(html,/aria-describedby="boss-bonus-tooltip"/);
    assert.match(html,/This boss can drop one additional eligible item from this chapter/);
    assert.match(html,/<strong>Boss Bonus<\/strong>/);
    assert.match(html,/>\?<\/span>/);
    assert.doesNotMatch(html,/Normal rewards|boss-bonus-section|boss-bonus-badge/);
    assert.ok(!html.includes('Exclusive'));
  }
  assert.ok(!encounterLootMarkup([GEAR[0]]).includes('Boss Bonus'));
  assert.equal((encounterLootMarkup([],[],true).match(/class="loot-reward boss-bonus-reward"/g)||[]).length,1);
});
test('item details label the role and comparisons include removed stats and secondary units',()=>{
  assert.match(itemDetails(GEAR[0]),/Role: Healer/);
  const a={stats:{spellPower:17,haste:2}}, b={stats:{spellPower:23,crit:2.5}};
  assert.equal(itemComparison(a,b),'-6 Spell Power · +2% Haste · -2.5% Crit');
  assert.equal(itemComparison({stats:{manaRegen:.25}},{stats:{manaRegen:.2}}),'+0.05 Mana regeneration');
});
