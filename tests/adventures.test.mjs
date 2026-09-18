import test from 'node:test';
import assert from 'node:assert/strict';
import { ADVENTURES } from '../src/data.js';
import { nodeState } from '../src/adventures.js';

test('journey begins at the existing encounter; unreleased branches stay locked after victory', () => {
  const [start, ...future] = ADVENTURES;
  assert.equal(nodeState(start, new Set()), 'available');
  const completed = new Set([start.id]);
  assert.equal(nodeState(start, completed), 'completed');
  for (const node of future) assert.equal(nodeState(node, completed), 'locked');
});

test('a released route can unlock from either completed predecessor', () => {
  const node = { id: 'later', encounter: 'later', from: ['left', 'right'] };
  assert.equal(nodeState(node, new Set()), 'locked');
  assert.equal(nodeState(node, new Set(['left'])), 'available');
  assert.equal(nodeState(node, new Set(['right'])), 'available');
});
