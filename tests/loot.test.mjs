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
  assert.equal(rollNormalLoot(table, [], 'priest', sequence([0.5, 0.299999, 0]))[0].owner, 'priest');
  assert.equal(rollNormalLoot(table, [], 'druid', sequence([0.5, 0.299999, 0]))[0].owner, 'druid');
  assert.equal(rollNormalLoot(table, [], 'priest', sequence([0.5, 0.3, 0]))[0].owner, 'tank');
  assert.equal(rollNormalLoot(table, [], 'priest', sequence([0.5, 0.475, 0]))[0].owner, 'rogue');
  assert.equal(rollNormalLoot(table, [], 'priest', sequence([0.5, 0.65, 0]))[0].owner, 'mage');
  assert.equal(rollNormalLoot(table, [], 'priest', sequence([0.5, 0.9, 0]))[0].owner, 'ranger');
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
