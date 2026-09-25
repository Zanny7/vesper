import test from 'node:test';
import assert from 'node:assert/strict';
import { clearVesperLocalState, VESPER_LOCAL_STORAGE_KEYS } from '../src/hard-reset.js';

test('hard reset removes every registered Vesper key and preserves unrelated origin data', () => {
  const values = new Map([
    ...VESPER_LOCAL_STORAGE_KEYS.map(key => [key, 'saved']),
    ['another-app-preference', 'keep'],
  ]);
  const storage = { removeItem(key) { values.delete(key); } };

  assert.deepEqual(clearVesperLocalState(storage), { ok: true });
  assert.deepEqual([...values], [['another-app-preference', 'keep']]);
});

test('hard reset reports unavailable or failing storage', () => {
  assert.equal(clearVesperLocalState(null).ok, false);
  assert.equal(clearVesperLocalState({ removeItem() { throw new Error('blocked'); } }).ok, false);
});
