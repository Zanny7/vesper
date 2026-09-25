import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { CHAPTERS, GEAR } from '../src/data.js';
import { canEquipItem } from '../src/item-model.js';
import { TALENT_TREES } from '../src/talent-trees.js';
import { extraClearsAfterBoss, readinessClears, recursiveInheritedEquipment, seeded } from '../scripts/boss-balance.mjs';

test('chapter readiness samples use live routes, legal equipped gear, and reproducible seeds', () => {
  const run = () => execFileSync(process.execPath, ['scripts/chapter-benchmarks.mjs', '8'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  const first = run();
  assert.equal(first, run());
  const data = JSON.parse(first);
  assert.equal(data.slotCount, 27);
  assert.equal(data.inheritanceModel, 'recursive');
  assert.deepEqual(data.chapters.map(chapter => chapter.routeLengths), [[3], [3], [5], [5]]);
  assert.deepEqual(data.chapters.map(chapter => chapter.routeCount), [1, 2, 4, 4]);
  for (const chapter of data.chapters) for (const tier of Object.values(chapter.tiers)) {
    assert.equal(tier.percentPartySlots, Math.round(10000 * tier.equippedChapterItems / 27) / 100);
    for (const [healer, row] of Object.entries(tier.byHealer)) {
      const equipped = Object.entries(row.representative.loadout).flatMap(([owner, slots]) => Object.entries(slots).map(([slot, id]) => {
        const item = GEAR.find(candidate => candidate.id === id);
        assert.ok(canEquipItem(owner, slot, item));
        assert.notEqual(owner, healer === 'priest' ? 'druid' : 'priest');
        return item;
      }));
      assert.equal(new Set(equipped.map(item => item.id)).size, equipped.length);
      assert.equal(equipped.filter(item => item.chapter === chapter.chapter).length, row.representative.currentCount);
      assert.ok(equipped.length <= data.slotCount);
      for (const prior of row.priorChapterMeans) {
        const expected = tier === chapter.tiers.veryGood ? [2, 0] : tier === chapter.tiers.average ? [3, .5] : [4.5, 1.5];
        assert.equal(prior.readinessClears, expected[0]);
        assert.equal(prior.extraClears, expected[1]);
      }
    }
  }
});

test('prior chapters carry one evolving equipment state through boss rewards and profile-specific extra clears', () => {
  for (const [profile, readiness, extra] of [['veryGood', [2, 2], [0, 0]], ['average', [3, 3], [0, 1]], ['weak', [4, 5], [1, 2]]]) {
    for (let previous = 0; previous < 2; previous++) {
      assert.equal(readinessClears(profile, 100, previous), readiness[previous]);
      assert.equal(extraClearsAfterBoss(profile, 100, previous), extra[previous]);
    }
    const { equipment, history } = recursiveInheritedEquipment(3, 'priest', profile, 100, seeded(100));
    assert.equal(history.length, 3);
    assert.deepEqual(history.map(row => row.extraClears), [extra[0], extra[1], extra[0]]);
    assert.equal(Object.values(equipment.equipped).flatMap(slots => Object.values(slots)).length, history[2].equippedCountAfter);
    assert.ok(equipment.collection().some(item => item.chapter === 1));
    assert.ok(equipment.collection().some(item => item.chapter === 3));
    assert.ok(equipment.collection().every(item => item.chapter < 4));
  }
});

test('BAT-68 representative talent presets remain legal and match the point budget', () => {
  const data = JSON.parse(execFileSync(process.execPath, ['scripts/chapter-benchmarks.mjs', '1'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' }));
  assert.equal(data.chapters.length, CHAPTERS.length);
  for (const [chapter, byHealer] of Object.entries(data.talentPresets)) for (const [healer, choices] of Object.entries(byHealer)) {
    for (const allocation of Array.isArray(choices) ? choices : [choices]) {
      assert.equal(Object.values(allocation).reduce((sum, ranks) => sum + ranks, 0), 2 * Number(chapter) - 1);
      for (const [id, rank] of Object.entries(allocation)) {
        const talent = TALENT_TREES[healer].find(candidate => candidate.id === id);
        assert.ok(talent, id);
        assert.ok(rank <= (talent.maxRank || 1));
      }
    }
  }
  assert.equal(data.talentPresets[4].priest.length, 2);
  assert.equal(data.talentPresets[4].druid.length, 2);
});
