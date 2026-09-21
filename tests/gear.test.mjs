import test from 'node:test';
import { GEAR } from './fixtures/gear.mjs';
import assert from 'node:assert/strict';
import { Equipment, SLOTS } from '../src/gear.js';
import { partyForHealer } from '../src/data.js';
import { fullResources, reconcileResources } from '../src/chapter-runs.js';
import { Combat } from '../src/combat.js';

const disk = () => { const map = new Map(); return { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value) }; };
const stocked = (storage, lock) => { const gear = new Equipment(storage, lock, GEAR); GEAR.forEach(item => gear.acquire(item.id)); return gear; };
const member = (id, healer = 'priest') => partyForHealer(healer).find(hero => hero.id === id);

test('every party member has only the specified character-specific slots', () => {
  assert.deepEqual(SLOTS.healer, ['Weapon', 'Tome', 'Trinket', 'Head', 'Chest', 'Legs']);
  assert.deepEqual(SLOTS.tank, ['Weapon', 'Shield', 'Trinket', 'Head', 'Chest', 'Legs']);
  assert.deepEqual(SLOTS.rogue, ['Sword', 'Trinket', 'Head', 'Chest', 'Legs']);
  assert.deepEqual(SLOTS.mage, ['Staff', 'Trinket', 'Head', 'Chest', 'Legs']);
  assert.deepEqual(SLOTS.ranger, ['Bow', 'Trinket', 'Head', 'Chest', 'Legs']);
});

test('only owned gear valid for the selected character and slot can be equipped', () => {
  const equipment = stocked(disk()), aldric = member('tank'), nyx = member('rogue');
  assert.equal(equipment.equip(aldric, 'Shield', 'test-aldric-shield'), true);
  assert.equal(equipment.item(aldric, 'Shield').name, 'Test equipment');
  assert.equal(equipment.equip(nyx, 'Sword', 'test-aldric-blade'), false);
  assert.equal(equipment.item(nyx, 'Sword'), null);
  assert.equal(equipment.equip(aldric, 'Boots', 'test-aldric-shield'), false);
});

test('equipped gear derives healer, defense, and companion weapon stats without changing bases', () => {
  const equipment = stocked(disk()), aldric = member('tank'), priest = member('priest');
  equipment.equip(aldric, 'Weapon', 'test-aldric-blade'); equipment.equip(aldric, 'Shield', 'test-aldric-shield');
  equipment.equip(priest, 'Weapon', 'test-priest-censer'); equipment.equip(priest, 'Tome', 'test-priest-codex');
  const gearedAldric = equipment.apply(aldric), gearedPriest = equipment.apply(priest);
  assert.equal(aldric.damage, 7); assert.equal(gearedAldric.damage, 11); assert.equal(gearedAldric.armor, 10);
  assert.equal(priest.maxMana, 600); assert.equal(gearedPriest.maxMana, 680); assert.equal(gearedPriest.spellPower, 12);
});

test('equipment survives a reload and keeps Priest and Druid gear separate', () => {
  const storage = disk(), equipment = stocked(storage);
  equipment.equip(member('priest'), 'Weapon', 'test-priest-censer'); equipment.equip(member('druid', 'druid'), 'Weapon', 'test-druid-idol');
  const restored = new Equipment(storage, undefined, GEAR);
  assert.equal(restored.item(member('priest'), 'Weapon').id, 'test-priest-censer');
  assert.equal(restored.item(member('druid', 'druid'), 'Weapon').id, 'test-druid-idol');
});

test('resource gear applies BAT-19 maximum-resource adjustments to preserved runs', () => {
  const equipment = stocked(disk()), base = equipment.party('priest'), resources = fullResources(base);
  resources.health.tank.current = 300; resources.mana.current = 360;
  equipment.equip(member('tank'), 'Trinket', 'test-aldric-token'); equipment.equip(member('priest'), 'Tome', 'test-priest-codex');
  const raised = reconcileResources(resources, equipment.party('priest'));
  assert.deepEqual(raised.health.tank, { current: 370, max: 670 });
  assert.deepEqual(raised.mana, { current: 440, max: 680 });
  equipment.equip(member('tank'), 'Trinket', ''); equipment.equip(member('priest'), 'Tome', '');
  assert.deepEqual(reconcileResources(raised, equipment.party('priest')).mana, { current: 440, max: 600 });
});

test('combat lock rejects equipping and unequipping without modifying persisted gear', () => {
  const storage = disk(); let locked = false;
  const equipment = stocked(storage, () => locked), tank = member('tank');
  equipment.equip(tank, 'Shield', 'test-aldric-shield');
  locked = true;
  assert.equal(equipment.equip(tank, 'Shield', ''), false);
  assert.equal(equipment.equip(tank, 'Weapon', 'test-aldric-blade'), false);
  assert.equal(new Equipment(storage, undefined, GEAR).item(tank, 'Shield').id, 'test-aldric-shield');
  assert.equal(new Equipment(storage, undefined, GEAR).item(tank, 'Weapon'), null);
});

test('equipped weapons and defenses change real combat events without retuning enemies', () => {
  const equipment = stocked(disk()), tank = member('tank');
  equipment.equip(tank, 'Shield', 'test-aldric-shield'); equipment.equip(tank, 'Weapon', 'test-aldric-blade');
  equipment.equip(member('mage'), 'Trinket', 'test-sera-token');
  const baseline = new Combat(), geared = new Combat(undefined, () => .5, equipment.party('priest'));
  for (const game of [baseline, geared]) {
    game.start(); game.step(1.01);
    game.damage(game.party[0], 30, 'test', 'Physical');
    game.damage(game.party[2], 30, 'test', 'Magic');
  }
  assert.equal(baseline.boss.hp - geared.boss.hp, 8);
  assert.equal(geared.party[0].hp - baseline.party[0].hp, 10);
  assert.equal(geared.party[2].hp - baseline.party[2].hp, 6);
  assert.deepEqual(geared.encounter, baseline.encounter);
});

test('invalid saved character/slot assignments never contribute stats', () => {
  const storage = disk();
  storage.setItem('vesper-equipment-v1', JSON.stringify({ rogue: { Sword: 'test-aldric-blade' }, priest: { Weapon: 'sera-staff' }, tank: { Shield: 'test-aldric-shield', Head: 'test-aldric-shield' } }));
  const equipment = stocked(storage);
  assert.equal(equipment.apply(member('tank')).armor, 10);
  assert.equal(equipment.apply(member('rogue')).damage, 15);
  assert.equal(equipment.apply(member('priest')).damage, 0);
});
