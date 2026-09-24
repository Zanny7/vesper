import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, GEAR } from '../src/data.js';
import { BOSS_BONUS_LOOT_TABLES, NORMAL_LOOT_TABLES, normalDropCount, rollBossBonusLoot, rollNormalLoot } from '../src/loot.js';

const sequence = values => {
  let index = 0;
  return () => values[index++] ?? 0;
};

test('every encounter has a canonical multi-character normal loot table', () => {
  const byId = new Map(GEAR.map(item => [item.id, item]));
  for (const [chapterIndex, chapter] of CHAPTERS.entries()) for (const node of chapter.nodes) {
    const table = NORMAL_LOOT_TABLES[node.encounter];
    assert.ok(table.length >= 6, node.encounter);
    assert.equal(new Set(table).size, table.length, node.encounter);
    const items = table.map(id => byId.get(id));
    assert.ok(items.every(Boolean), node.encounter);
    assert.ok(items.every(item => item.chapter === chapterIndex + 1), node.encounter);
    assert.deepEqual(new Set(items.map(item => item.owner)), new Set(['priest', 'druid', 'tank', 'rogue', 'mage', 'ranger']));
  }
});

test('normal drop count follows the 50 / 35 / 15 boundaries', () => {
  assert.equal(normalDropCount(() => 0), 0);
  assert.equal(normalDropCount(() => 0.499999), 0);
  assert.equal(normalDropCount(() => 0.5), 1);
  assert.equal(normalDropCount(() => 0.849999), 1);
  assert.equal(normalDropCount(() => 0.85), 2);
  assert.equal(normalDropCount(() => 0.999999), 2);
});

test('drop weighting targets only the active healer and preserves companion bands', () => {
  const table = NORMAL_LOOT_TABLES.sentinel;
  const boundaryTable = ['priest', 'tank', 'rogue', 'mage', 'ranger'].map(owner => GEAR.find(item => item.owner === owner &&
    (owner === 'priest' || !['Trinket', 'Head', 'Chest', 'Legs'].includes(item.slot))).id);
  const ownerAt = roll => rollNormalLoot(boundaryTable, [], 'priest', sequence([0.5, roll, 0]))[0].owner;
  assert.equal(ownerAt(0.299999), 'priest');
  assert.equal(rollNormalLoot(table, [], 'druid', sequence([0.5, 0.299999, 0]))[0].owner, 'druid');

  for (const [boundary, below, at, above] of [
    [0.3, 'priest', 'tank', 'tank'],
    [0.475, 'tank', 'rogue', 'rogue'],
    [0.65, 'rogue', 'mage', 'mage'],
    [0.825, 'mage', 'ranger', 'ranger'],
  ]) {
    assert.equal(ownerAt(boundary - 0.000001), below, `just below ${boundary}`);
    assert.equal(ownerAt(boundary), at, `at ${boundary}`);
    assert.equal(ownerAt(boundary + 0.000001), above, `just above ${boundary}`);
  }
  assert.equal(ownerAt(0.999999), 'ranger');
  assert.equal(ownerAt(1), 'ranger');
});

test('owned items are excluded and exhausted pools return fewer rewards without duplicates', () => {
  const table = NORMAL_LOOT_TABLES.sentinel;
  const priest = GEAR.find(item => table.includes(item.id) && item.owner === 'priest');
  const owned = table.filter(id => id !== priest.id);
  const rewards = rollNormalLoot(table, owned, 'priest', sequence([0.85, 0, 0, 0, 0]));
  assert.deepEqual(rewards.map(item => item.id), [priest.id]);
  assert.deepEqual(rollNormalLoot(table, table, 'priest', sequence([0.85])), []);
});

test('chapter bosses have a hidden, chapter-local bonus pool with one eligible reward', () => {
  const byId = new Map(GEAR.map(item => [item.id, item]));
  for (const [chapterIndex, chapter] of CHAPTERS.entries()) for (const node of chapter.nodes.filter(node => node.kind === 'boss')) {
    const table = BOSS_BONUS_LOOT_TABLES[node.encounter];
    assert.ok(table.length > 0, node.encounter);
    assert.ok(table.every(id => byId.get(id)?.chapter === chapterIndex + 1));
    assert.ok(table.every(id => !NORMAL_LOOT_TABLES[node.encounter].includes(id)));
    const reward = rollBossBonusLoot(table, [], 'priest', sequence([0, 0]));
    assert.equal(reward.length, 1);
    assert.equal(reward[0].owner, 'priest');
    assert.deepEqual(rollBossBonusLoot(table, table, 'priest'), []);
  }
});
