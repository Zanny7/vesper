import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS } from '../src/data.js';
import { TALENT_ROW_REQUIREMENTS, TalentProgression, validateTalentTree } from '../src/talents.js';
import { TALENT_TREES } from '../src/talent-trees.js';

const tree = prefix => Array.from({ length: 12 }, (_, index) => ({
  id: `${prefix}-${index + 1}`,
  row: Math.floor(index / 3) + 1,
  maxRank: index % 5 === 0 ? 2 : 1,
}));
const trees = { priest: tree('priest'), druid: tree('druid') };
const disk = () => { const data = new Map(); return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }; };
const award = (talents, healerId, count) => {
  for (let index = 0; index < count; index++) talents.ensure(healerId).milestones.push(`test:${index}`);
};

test('talent trees require four rows of three talents and support one or two ranks', () => {
  assert.deepEqual(TALENT_ROW_REQUIREMENTS, [0, 2, 4, 6]);
  assert.deepEqual(validateTalentTree(trees.priest), []);
  assert.match(validateTalentTree(trees.priest.slice(1))[0], /12 talents/);
  assert.ok(validateTalentTree(trees.priest.map((talent, index) => index === 0 ? { ...talent, maxRank: 3 } : talent)).some(error => /one or two ranks/.test(error)));
});

test('production Priest and Druid definitions expose all twelve named talents', () => {
  for (const [healerId, tree] of Object.entries(TALENT_TREES)) {
    assert.deepEqual(validateTalentTree(tree), [], healerId);
    assert.equal(new Set(tree.map(talent => talent.name)).size, 12);
    assert.ok(tree.every(talent => talent.description.length > 12));
  }
});

test('legacy Priest talent IDs migrate to their redesigned names and persist', () => {
  const storage = disk();
  storage.setItem('vesper-talents-v1', JSON.stringify({
    version: 1,
    healers: { priest: {
      milestones: Array.from({ length: 8 }, (_, index) => `ch1:${index}`),
      allocations: { 'quick-remedy': 2, 'measured-casting': 1, 'threefold-penance': 1 },
    } },
  }));
  const talents = new TalentProgression(storage, TALENT_TREES);
  assert.deepEqual(talents.state('priest').allocations, {
    'binding-light': 2, 'early-mercy': 1, 'fourfold-penance': 1,
  });
  const persisted = JSON.parse(storage.getItem('vesper-talents-v1'));
  assert.equal(persisted.healers.priest.allocations['quick-remedy'], undefined);
  assert.equal(persisted.healers.priest.allocations['binding-light'], 2);
});

test('legacy Preserved Growth point becomes Natural Regeneration without losing the Druid budget', () => {
  const storage = disk();
  storage.setItem('vesper-talents-v1', JSON.stringify({ version: 1, healers: { druid: {
    milestones: Array.from({ length: 8 }, (_, index) => `ch1:${index}`),
    allocations: { 'preserved-growth': 1, 'empowered-rejuvenation': 2, 'nourishing-touch': 1 },
  } } }));
  const talents = new TalentProgression(storage, TALENT_TREES);
  assert.deepEqual(talents.state('druid').allocations, {
    'natural-regeneration': 1, 'empowered-rejuvenation': 2, 'nourishing-touch': 1,
  });
  assert.equal(JSON.parse(storage.getItem('vesper-talents-v1')).healers.druid.allocations['preserved-growth'], undefined);
  assert.equal(TALENT_TREES.druid.reduce((sum, talent) => sum + (talent.maxRank || 1), 0), 17);
});

test('earned points, ranks and row rules remain independent per healer', () => {
  const storage = disk(), talents = new TalentProgression(storage, trees); award(talents, 'priest', 8); award(talents, 'druid', 1);
  assert.equal(talents.spend('priest', 'priest-4').ok, false);
  assert.equal(talents.spend('priest', 'priest-1').ok, true);
  assert.equal(talents.spend('priest', 'priest-1').ok, true);
  assert.equal(talents.spend('priest', 'priest-1').ok, false);
  assert.equal(talents.rowUnlocked('priest', 2), true);
  assert.equal(talents.spend('priest', 'priest-4').ok, true);
  assert.equal(talents.state('priest').spentPoints, 3);
  assert.deepEqual(talents.state('druid').allocations, {});
  assert.equal(talents.state('druid').earnedPoints, 1);
  talents.save();
  const restored = new TalentProgression(storage, trees);
  assert.equal(restored.state('priest').allocations['priest-1'], 2);
  assert.deepEqual(restored.state('druid').allocations, {});
});

test('refunds preserve row validity and free respec is blocked only during combat', () => {
  let combat = false;
  const talents = new TalentProgression(disk(), trees, () => combat); award(talents, 'priest', 8);
  for (const id of ['priest-1', 'priest-1', 'priest-4', 'priest-2']) assert.equal(talents.spend('priest', id).ok, true);
  assert.equal(talents.spend('priest', 'priest-7').ok, true);
  assert.equal(talents.refund('priest', 'priest-1').ok, true);
  assert.equal(talents.refund('priest', 'priest-1').ok, false);
  combat = true;
  assert.equal(talents.refund('priest', 'priest-7').ok, false);
  assert.equal(talents.respec('priest').ok, false);
  combat = false;
  assert.equal(talents.respec('priest').ok, true);
  assert.equal(talents.state('priest').unspentPoints, 8);
});

test('first-encounter and boss milestones award once, persist, and survive run resets', () => {
  const storage = disk(), talents = new TalentProgression(storage, trees), chapter = CHAPTERS[0];
  assert.equal(talents.awardEncounter('priest', chapter, chapter.nodes[1]), 0);
  assert.equal(talents.awardEncounter('priest', chapter, chapter.nodes[0]), 1);
  assert.equal(talents.awardEncounter('priest', chapter, chapter.nodes[0]), 0);
  assert.equal(talents.awardEncounter('priest', chapter, chapter.nodes.at(-1)), 1);
  assert.equal(talents.state('priest').earnedPoints, 2);
  assert.equal(talents.state('druid').earnedPoints, 0);
  assert.equal(new TalentProgression(storage, trees).state('priest').earnedPoints, 2);
});

test('four current chapters provide eight distinct milestone points per healer', () => {
  const talents = new TalentProgression(disk(), trees);
  for (const chapter of CHAPTERS) {
    assert.equal(talents.awardEncounter('druid', chapter, chapter.nodes[0]), 1);
    assert.equal(talents.awardEncounter('druid', chapter, chapter.nodes.at(-1)), 1);
  }
  assert.equal(talents.state('druid').earnedPoints, 8);
  assert.equal(talents.state('priest').earnedPoints, 0);
});

test('legacy campaign reconciliation grants only legitimate completed milestones', () => {
  const storage = disk(), talents = new TalentProgression(storage, trees);
  const completed = new Set([...CHAPTERS[0].nodes.map(node => node.id), CHAPTERS[1].nodes.at(-1).id]);
  assert.equal(talents.migrateLegacyCampaign('priest', completed), 2);
  assert.equal(talents.migrateLegacyCampaign('druid', completed), 0);
  assert.equal(new TalentProgression(storage, trees).migrateLegacyCampaign('druid', completed), 0);
  assert.equal(talents.state('priest').earnedPoints, 2);
  assert.equal(talents.state('druid').earnedPoints, 0);
});
