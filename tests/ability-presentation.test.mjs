import test from 'node:test';
import assert from 'node:assert/strict';
import { compactKeybind, formatCooldown } from '../src/ability-presentation.js';

test('key labels abbreviate modifiers and preserve the base key', () => {
  for (const [input, expected] of [['1','1'], ['Shift+1','S1'], ['Ctrl+2','C2'], ['Control + 2','C2'], ['Alt+3','A3'], ['Option+3','A3'], ['Meta+4','M4'], ['Cmd+4','M4'], ['Ctrl+Shift+1','CS1'], ['Shift+F10','SF10']]) {
    assert.equal(compactKeybind(input), expected);
  }
});

test('cooldown labels use compact seconds, a padded minute format, and no suffixes', () => {
  for (const [input, expected] of [[0,''], [-1,''], [0.01,'0.1'], [1.5,'1.5'], [10,'10'], [59.9,'59.9'], [59.96,'59.9'], [60,'1.00'], [60.6,'1.01'], [65,'1.05'], [95,'1.35'], [119.9,'2.00'], [600,'10.00']]) {
    assert.equal(formatCooldown(input), expected);
  }
});
