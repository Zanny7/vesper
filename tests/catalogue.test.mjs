import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GEAR, GEAR_CHAPTER_BANDS } from '../src/data.js';
import { ITEM_OWNERS, slotsForOwner, validateCatalogue, averageItemLevel } from '../src/item-model.js';
import { Equipment } from '../src/gear.js';
import { itemIcon, equipmentSlot } from '../src/equipment.js';

test('Chapters 1 and 2 cover every character slot with fixed, valid metadata', () => {
  assert.deepEqual(validateCatalogue(GEAR), []);
  assert.equal(GEAR.length, 66);
  assert.equal(new Set(GEAR.map(item => item.name)).size, GEAR.length);
  for (const chapter of [1, 2]) for (const owner of ITEM_OWNERS) {
    const items = GEAR.filter(item => item.chapter === chapter && item.owner === owner);
    assert.deepEqual(items.map(item => item.slot).sort(), [...slotsForOwner(owner)].sort());
    const equipment = { [owner]: Object.fromEntries(items.map(item => [item.slot, item.id])) };
    assert.ok(Math.abs(averageItemLevel({ id: owner }, equipment) - (chapter === 1 ? 2 : 5)) < .2);
  }
  for (const item of GEAR) {
    const [min, max] = GEAR_CHAPTER_BANDS[item.chapter];
    assert.ok(item.itemLevel >= min && item.itemLevel <= max);
    assert.match(item.id, /^ch[12]-/);
    assert.ok(item.flavor.length > 15);
    assert.ok(Object.values(item.stats).every(value => value > 0));
    assert.ok(!('haste' in item.stats) && !('crit' in item.stats), 'do not sell inert combat bonuses');
  }
});

test('each item has a distinct local SVG illustration used by shared presentation', () => {
  const drawings = new Set();
  assert.equal(new Set(GEAR.map(item => item.icon)).size, GEAR.length);
  for (const item of GEAR) {
    const svg = readFileSync(new URL(`..${item.icon}`, import.meta.url), 'utf8');
    assert.match(svg, /viewBox="0 0 64 64"/);
    assert.ok(!/<script|<image|href=/.test(svg));
    drawings.add(svg.replace(/<title>.*?<\/title>/, ''));
    assert.ok(itemIcon(item).includes(item.icon));
    assert.ok(equipmentSlot({ id: item.owner }, item.slot, item, false).includes(item.icon));
  }
  assert.equal(drawings.size, GEAR.length, 'unique filenames alone are not distinct artwork');
});

test('authored chapter upgrades increase main output and total survivability without auto-grants', () => {
  const totals = {};
  for (const chapter of [1, 2]) {
    const gear = new Equipment();
    assert.deepEqual(gear.collection(), []);
    for (const item of GEAR.filter(item => item.chapter === chapter)) {
      assert.equal(gear.acquire(item.id), true);
      assert.equal(gear.acquire(item.id), false);
      assert.equal(gear.equip({ id: item.owner }, item.slot, item.id), true);
    }
    totals[chapter] = Object.fromEntries(ITEM_OWNERS.map(id => [id, gear.apply({ id })]));
  }
  for (const owner of ITEM_OWNERS) {
    const lower = totals[1][owner], upper = totals[2][owner];
    const output = ['priest', 'druid'].includes(owner) ? 'spellPower' : 'damage';
    assert.ok(upper[output] > lower[output]);
    assert.ok(upper.maxHp > lower.maxHp);
    assert.ok(upper.armor + upper.resistance > lower.armor + lower.resistance);
    if (output === 'spellPower') {
      assert.ok(upper.maxMana > lower.maxMana);
      assert.ok(upper.manaRegen > lower.manaRegen);
    }
  }
});
