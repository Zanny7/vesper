import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CONFIG, HEALERS, SHAMAN_TALENT_VALUES, GEAR } from '../src/data.js';
import { beforeBat102Healers } from '../scripts/bat-102-priest-scope.mjs';
import { historicalHealersBeforeBat103 } from './fixtures/bat103-original-healers.mjs';

const baseline = JSON.parse(readFileSync(new URL('../scripts/fixtures/bat93-mana.json', import.meta.url)));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('BAT-93 Mana baseline preserves spells, talents and all other item fields', () => {
  assert.equal(CONFIG.encounterManaRecovery, .2);
  assert.equal(CONFIG.manaRegen, 3);
  for (const item of GEAR.filter(item=>item.chapter<=4)) if (item.stats.manaRegen != null) {
    assert.ok(Math.abs(item.stats.manaRegen - baseline.itemRegen[item.id] * 1.5) < 1e-10, item.id);
  }
  // Encounter scope is guarded against the post-BAT-93 snapshot in
  // chapter4-pressure.test.mjs; BAT-94 intentionally changes five normals.
  const fixedHealers = Object.fromEntries(Object.entries(historicalHealersBeforeBat103(beforeBat102Healers(HEALERS))).map(([id, { manaRegen, ...healer }]) => [id, healer]));
  assert.equal(hash(fixedHealers), baseline.fixedHashes.healers);
  assert.equal(hash(SHAMAN_TALENT_VALUES), baseline.fixedHashes.shamanTalents);
  const withoutRegen = GEAR.filter(item=>item.chapter<=4).map(({ stats: { manaRegen, ...stats }, ...item }) => ({ ...item, stats }));
  assert.equal(hash(withoutRegen), baseline.fixedHashes.gearWithoutRegen);
});
