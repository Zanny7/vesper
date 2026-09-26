import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, GEAR, HEALERS, SLOTS } from '../src/data.js';
import { Equipment } from '../src/gear.js';
import { canEquipItem, eligibleItems } from '../src/item-model.js';
import { buildNormalLootTables, NORMAL_LOOT_TABLES, BOSS_BONUS_LOOT_TABLES, eligibleLootPool, rollNormalLoot, rollBossBonusLoot } from '../src/loot.js';
import { auditGearParity, itemSummary } from '../scripts/gear-parity.mjs';
import { regeared } from '../scripts/boss-balance.mjs';
import { sampleGearProgression } from '../scripts/shaman-gear-progression.mjs';

test('Shaman has six comparable authored slots and the same boss-only opportunities per chapter', () => {
  for (const chapter of auditGearParity()) for (const slot of SLOTS.healer) {
    const shaman = chapter.healer.shaman[slot], peers = ['priest', 'druid'].map(id => chapter.healer[id][slot]);
    assert.equal(shaman.authored.length, 1);
    const item = shaman.authored[0];
    for (const peer of peers) {
      assert.equal(item.ilvl, peer.authored[0].ilvl);
      assert.equal(shaman.routeCoverage, peer.routeCoverage);
      assert.equal(shaman.preBoss.length, peer.preBoss.length);
      assert.equal(shaman.normalBoss.length, peer.normalBoss.length);
      assert.equal(shaman.hiddenBoss.length, peer.hiddenBoss.length);
      assert.equal(shaman.bonusOnly.length, peer.bonusOnly.length);
    }
    const budgets = peers.map(peer => peer.authored[0].budgetScore);
    assert.ok(item.budgetScore >= Math.min(...budgets) * .8 && item.budgetScore <= Math.max(...budgets) * 1.2, `${chapter.chapter} ${slot}`);
  }
});

test('adding Shaman leaves all original encounter and companion rotations intact', () => {
  const oldTables = buildNormalLootTables(CHAPTERS, GEAR.filter(item => item.owner !== 'shaman'));
  for (const [encounter, table] of Object.entries(NORMAL_LOOT_TABLES)) {
    assert.deepEqual(table.filter(id => GEAR.find(item => item.id === id).owner !== 'shaman'), oldTables[encounter]);
  }
  for (const chapter of auditGearParity()) assert.deepEqual(chapter.companionDifferences, []);
  // Every companion's full compatible catalogue is independent of healer choice.
  for (const id of ['tank', 'rogue', 'mage', 'ranger']) {
    const expected = eligibleItems(id).map(item => item.id);
    for (const healer of Object.keys(HEALERS)) {
      const member = new Equipment().party(healer).find(member => member.id === id);
      assert.deepEqual(eligibleItems(member.id).map(item => item.id), expected);
    }
  }
});

test('Shaman weapons/tomes are exclusive and shared armor/trinket compatibility is preserved', () => {
  for (const item of GEAR.filter(item => item.owner === 'shaman')) {
    for (const healer of Object.keys(HEALERS)) {
      const exclusive = ['Weapon', 'Tome'].includes(item.slot);
      assert.equal(canEquipItem(healer, item.slot, item), !exclusive || healer === 'shaman');
    }
  }
  for (const item of GEAR.filter(item => ['priest', 'druid'].includes(item.owner) && ['Weapon', 'Tome'].includes(item.slot)))
    assert.equal(canEquipItem('shaman', item.slot, item), false);
});

test('Shaman receives real normal and hidden boss rewards without changing category boundaries', () => {
  for (const chapter of CHAPTERS) {
    const first = chapter.nodes[0], boss = chapter.nodes.find(node => node.kind === 'boss');
    // Universal defensive trinkets can be healer drops too. Use an exclusive
    // companion weapon per category to exercise the five nominal boundaries.
    const boundaryTable = ['shaman', 'tank', 'rogue', 'mage', 'ranger'].map(owner => GEAR.find(item =>
      item.chapter === CHAPTERS.indexOf(chapter) + 1 && item.owner === owner &&
      ['Weapon', 'Sword', 'Staff', 'Bow'].includes(item.slot)).id);
    for (const [roll, expected] of [[.299999, 'shaman'], [.3, 'tank'], [.475, 'rogue'], [.65, 'mage'], [.825, 'ranger']]) {
      let calls = 0;
      const reward = rollNormalLoot(boundaryTable, [], 'shaman', () => [ .5, roll, 0 ][calls++]);
      assert.equal(reward[0].owner, expected, first.encounter);
    }
    const bonus = BOSS_BONUS_LOOT_TABLES[boss.encounter];
    for (const item of GEAR.filter(item => item.chapter === CHAPTERS.indexOf(chapter) + 1 && item.owner === 'shaman')) {
      const table = NORMAL_LOOT_TABLES[boss.encounter].includes(item.id) ? NORMAL_LOOT_TABLES[boss.encounter] : bonus;
      const owned = GEAR.filter(candidate => candidate.id !== item.id).map(candidate => candidate.id);
      assert.deepEqual(eligibleLootPool(table, owned, 'shaman').map(candidate => candidate.id), [item.id]);
      assert.equal(rollBossBonusLoot(table, owned, 'shaman', () => 0)[0].id, item.id);
    }
  }
});

test('real Shaman gear equips, applies stats and reloads separately from Priest/Druid', () => {
  const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const equipment = new Equipment(storage);
  for (const healer of Object.keys(HEALERS)) for (const item of GEAR.filter(item => item.owner === healer && item.chapter === 4)) {
    equipment.acquire(item.id);
    assert.equal(equipment.equip({ id: healer }, item.slot, item.id), true);
  }
  const restored = new Equipment(storage);
  assert.deepEqual(restored.equipped, equipment.equipped);
  for (const slot of SLOTS.healer) assert.equal(restored.item({ id: 'shaman' }, slot).owner, 'shaman');
  const shaman = restored.healer('shaman');
  const stats = GEAR.filter(item => item.chapter === 4 && item.owner === 'shaman').reduce((sum, item) => {
    for (const [stat, value] of Object.entries(item.stats)) sum[stat] = (sum[stat] || 0) + value;
    return sum;
  }, {});
  for (const [stat, value] of Object.entries(stats)) assert.equal(shaman[stat], (HEALERS.shaman[stat] || 0) + value);
  assert.equal(restored.equip({ id: 'shaman' }, 'Weapon', 'ch4-crook-of-the-elder-hart'), false);
});

test('the shared progression sampler scores Shaman healing gear and uses actual equip rules', () => {
  const equipment = new Equipment();
  for (const item of GEAR.filter(item => item.owner === 'shaman' && item.chapter === 4)) equipment.acquire(item.id);
  const geared = regeared(equipment, 'shaman');
  for (const slot of ['Weapon', 'Tome', 'Trinket']) assert.ok(geared.item({ id: 'shaman' }, slot), slot);
  assert.equal(geared.healer('shaman').spellPower, 38);
  assert.ok(itemSummary(geared.item({ id: 'shaman' }, 'Weapon')).budgetScore > 0);
  for (const row of sampleGearProgression(2).rows) {
    assert.ok(row.meanPartyIlvl >= 0);
    const loadout = row.representative.loadout;
    const used = Object.values(loadout).flatMap(slots => Object.values(slots));
    assert.equal(new Set(used).size, used.length);
    for (const [owner, slots] of Object.entries(loadout)) for (const [slot, id] of Object.entries(slots))
      assert.ok(canEquipItem(owner, slot, GEAR.find(item => item.id === id)));
  }
});
