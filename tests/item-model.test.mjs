import test from 'node:test';
import { GEAR } from './fixtures/gear.mjs';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { GEAR_CHAPTER_BANDS } from '../src/data.js';
import { Equipment } from '../src/gear.js';
import { validateCatalogue, ITEM_STATS, slotsForOwner, eligibleItems, unownedItems, averageItemLevel } from '../src/item-model.js';

const disk = () => { const data = new Map(); return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }; };
test('retired prototype items are unavailable and saved references grant no stats', () => {
  for (const version of [1, 2]) {
    const storage = disk(), equipped = { priest: { Weapon: 'priest-censer' }, tank: { Shield: 'aldric-shield' } };
    storage.setItem(`vesper-equipment-v${version}`, JSON.stringify(version === 1 ? equipped : { version: 2, owned: ['priest-censer', 'aldric-shield'], equipped }));
    const gear = new Equipment(storage);
    assert.deepEqual(gear.collection(), []);
    assert.equal(gear.acquire('priest-censer'), false);
    assert.equal(gear.item({ id: 'tank' }, 'Shield'), null);
    assert.equal(gear.apply({ id: 'priest', spellPower: 0 }).spellPower, 0);
  }
});
test('authored catalogue has valid metadata, supported stats and existing icons', () => {
  assert.deepEqual(validateCatalogue(GEAR), []);
  assert.deepEqual(GEAR_CHAPTER_BANDS, { 1: [1, 3], 2: [4, 6], 3: [7, 9], 4: [10, 12] });
  for (const item of GEAR) assert.ok(existsSync(new URL(`..${item.icon}`, import.meta.url)));
  for (const stat of ITEM_STATS.healer) assert.deepEqual(validateCatalogue([{ ...GEAR[0], stats: { [stat]: 1 } }]), []);
  assert.deepEqual(slotsForOwner('healer'), []);
  assert.deepEqual(slotsForOwner('__proto__'), []);
  assert.ok(validateCatalogue([null, { ...GEAR[0], owner: 'unknown' }, { ...GEAR[0], stats: { damage: 5 } }]).length >= 3);
});
test('ownership is unique, persisted, and independent of the catalogue', () => {
  const storage = disk(), gear = new Equipment(storage, undefined, GEAR), priest = { id: 'priest' };
  assert.deepEqual(gear.collection(), []);
  assert.equal(gear.equip(priest, 'Weapon', 'test-priest-censer'), false);
  assert.equal(gear.acquire('missing'), false);
  assert.equal(gear.acquire('test-priest-censer'), true);
  assert.equal(gear.acquire('test-priest-censer'), false);
  assert.equal(gear.equip(priest, 'Weapon', 'test-priest-censer'), true);
  assert.equal(new Equipment(storage, undefined, GEAR).collection().length, 1);
  assert.equal(new Equipment(storage, undefined, GEAR).item(priest, 'Weapon').id, 'test-priest-censer');
  assert.equal(gear.apply({ id: 'priest', spellPower: 0 }).spellPower, 12);
  assert.equal(averageItemLevel(priest, gear.equipped, GEAR), 3 / 6);
  assert.equal(eligibleItems('priest', 'Weapon', GEAR).length, 1);
  assert.equal(unownedItems(GEAR, gear.ownedIds).length, GEAR.length - 1);
});
test('legacy migration preserves only valid equipped items and writes v2', () => {
  const storage = disk();
  storage.setItem('vesper-equipment-v1', JSON.stringify({ priest: { Weapon: 'test-priest-censer', Head: 'test-aldric-shield' } }));
  const gear = new Equipment(storage, undefined, GEAR);
  assert.deepEqual(gear.collection().map(item => item.id), ['test-priest-censer']);
  assert.equal(JSON.parse(storage.getItem('vesper-equipment-v2')).version, 2);
  gear.equip({ id: 'priest' }, 'Weapon', '');
  assert.equal(new Equipment(storage, undefined, GEAR).item({ id: 'priest' }, 'Weapon'), null);
});
test('malformed saves cannot equip unowned items; storage failures retain session ownership', () => {
  const storage = disk();
  storage.setItem('vesper-equipment-v2', JSON.stringify({ version: 2, owned: ['missing', 'test-priest-censer', 'test-priest-censer'], equipped: { tank: { Shield: 'test-aldric-shield' } } }));
  const gear = new Equipment(storage, undefined, GEAR);
  assert.equal(gear.collection().length, 1);
  assert.equal(gear.item({ id: 'tank' }, 'Shield'), null);
  storage.setItem('vesper-equipment-v2', '{');
  assert.deepEqual(new Equipment(storage, undefined, GEAR).collection(), []);
  const transient = new Equipment({ getItem() { throw Error(); }, setItem() { throw Error(); } }, undefined, GEAR);
  assert.equal(transient.acquire('test-priest-censer'), true);
  assert.equal(transient.owns('test-priest-censer'), true);
});
