import test from 'node:test';
import assert from 'node:assert/strict';
import { ADVENTURES, CHAPTER_ENCOUNTERS } from '../src/data.js';
import { nodeState, restoreProgress, chapterComplete, awardVictory } from '../src/adventures.js';
import { chapterState } from '../src/chapters.js';

test('four required fights unlock one at a time; chapter completes only after the boss', () => {
  const completed = new Set();
  assert.equal(ADVENTURES.length, 4);
  ADVENTURES.forEach((node, i) => {
    assert.equal(chapterComplete(completed), false);
    assert.deepEqual(node.from, i ? [ADVENTURES[i - 1].id] : []);
    for (const [j, other] of ADVENTURES.entries()) assert.equal(nodeState(other, completed), j < i ? 'completed' : j === i ? 'available' : 'locked');
    assert.equal(awardVictory(completed, node.id, { status: 'victory', encounter: CHAPTER_ENCOUNTERS[node.encounter] }), true);
  });
  assert.equal(ADVENTURES[3].kind, 'boss');
  assert.equal(chapterComplete(completed), true);
  assert.equal(awardVictory(completed, ADVENTURES[3].id, { status: 'victory', encounter: CHAPTER_ENCOUNTERS.warden }), false);
});

test('loss, abandonment, a different encounter, or a locked fight cannot award progress', () => {
  const completed = new Set(), node = ADVENTURES[0];
  for (const status of ['ready', 'running', 'paused', 'defeat']) assert.equal(awardVictory(completed, node.id, { status, encounter: CHAPTER_ENCOUNTERS.sentinel }), false);
  assert.equal(awardVictory(completed, null, { status: 'victory', encounter: CHAPTER_ENCOUNTERS.sentinel }), false);
  assert.equal(awardVictory(completed, node.id, { status: 'victory', encounter: CHAPTER_ENCOUNTERS.warden }), false);
  assert.equal(awardVictory(completed, ADVENTURES[3].id, { status: 'victory', encounter: CHAPTER_ENCOUNTERS.warden }), false);
  assert.equal(completed.size, 0);
});

test('saved progress restores only the contiguous chapter prefix, ignoring old prototype wins', () => {
  const ids = ADVENTURES.map(node => node.id);
  for (let n = 0; n <= 4; n++) assert.deepEqual([...restoreProgress(ids.slice(0, n))], ids.slice(0, n));
  for (const bad of [null, {}, 'threshold', ['sanctum'], ['unknown']]) assert.equal(restoreProgress(bad).size, 0);
  assert.deepEqual([...restoreProgress([ids[0], ids[0], ids[2], ids[3]])], [ids[0]]);
  assert.equal(chapterComplete(restoreProgress(ids.slice(0, 3))), false);
});

test('chapter cards communicate available, locked, and completed progression states', () => {
  assert.equal(chapterState({ state: 'available' }), 'available');
  assert.equal(chapterState({ state: 'locked' }), 'locked');
  assert.equal(chapterState({ state: 'completed' }), 'completed');
});
