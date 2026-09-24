import test from 'node:test';
import assert from 'node:assert/strict';
import { ChapterRuns, encounterState, fullResources, reconcileResources } from '../src/chapter-runs.js';
import { CHAPTERS, CHAPTER_ENCOUNTERS, HEALERS, partyForHealer } from '../src/data.js';
import { Combat } from '../src/combat.js';
import { chapterUnlocked, restoreCampaign } from '../src/progression.js';
import { eligibleNormalLootForEncounter, NORMAL_LOOT_TABLES, rollNormalLoot } from '../src/loot.js';
const chapter = CHAPTERS[0], party = partyForHealer('priest');
const disk = () => { const map = new Map(); return { getItem: k => map.get(k), setItem: (k, v) => map.set(k, v) }; };
function victory(runs, node, health = 300, mana = 360) {
  const resources = runs.begin(chapter, node, party); assert.ok(resources);
  const game = new Combat(CHAPTER_ENCOUNTERS[node.encounter]); game.reset(undefined, resources);
  game.party[0].hp = health; game.mana = mana; game.status = 'victory';
  assert.equal(runs.finish(chapter, node, game), true); return game;
}
test('exact surviving resources persist across map visits, healer changes and reloads', () => {
  const storage = disk(), runs = new ChapterRuns(storage);
  victory(runs, chapter.nodes[0], 300, 80);
  for (let i = 0; i < 10; i++) assert.equal(runs.get(chapter, party).resources.mana.current, 80);
  const restored = new ChapterRuns(storage), druid = partyForHealer('druid');
  const resources = restored.begin(chapter, chapter.nodes[1], druid);
  const game = new Combat(CHAPTER_ENCOUNTERS.keeper, () => 0, druid, HEALERS.druid.combatSpells);
  game.reset(undefined, resources); assert.equal(game.party[0].hp, 300); assert.equal(game.mana, 80);
  game.step(30); assert.equal(game.mana, 80); assert.equal(game.party[0].hp, 300);
  game.start(); game.pause(); game.step(30); assert.equal(game.mana, 80);
});
test('victory leaves a fallen companion down and does not top up survivors', () => {
  const runs = new ChapterRuns(disk());
  victory(runs, chapter.nodes[0], 300, 590);
  // Save a second normal victory with a dead companion after the first node.
  const resources = runs.begin(chapter, chapter.nodes[1], party);
  const next = new Combat(CHAPTER_ENCOUNTERS[chapter.nodes[1].encounter]);
  next.reset(undefined, resources); next.party[1].hp = 0; next.status = 'victory';
  assert.equal(runs.finish(chapter, chapter.nodes[1], next), true);
  const saved = runs.get(chapter, party).resources;
  assert.equal(saved.health.rogue.current, 0);
  assert.equal(saved.health.tank.current, 300);
  assert.equal(saved.mana.current, 590);
});
test('failure automatically starts a fresh playable run without touching permanent data', () => {
  const storage = disk(); storage.setItem('vesper-campaign-v3', '["threshold","gallery"]'); storage.setItem('future-gear', 'owned');
  const runs = new ChapterRuns(storage); victory(runs, chapter.nodes[0]);
  const resources = runs.begin(chapter, chapter.nodes[1], party), game = new Combat(CHAPTER_ENCOUNTERS.keeper);
  game.reset(undefined, resources); game.status = 'defeat'; assert.ok(runs.finish(chapter, chapter.nodes[1], game));
  assert.equal(runs.get(chapter, party).status, 'active');
  assert.deepEqual(runs.get(chapter, party).resources, fullResources(party));
  assert.equal(runs.begin(chapter, chapter.nodes[1], party), null); assert.ok(runs.begin(chapter, chapter.nodes[0], party));
  assert.equal(storage.getItem('vesper-campaign-v3'), '["threshold","gallery"]'); assert.equal(storage.getItem('future-gear'), 'owned');
});
test('an interrupted reload resets to the beginning instead of blocking the map', () => {
  const storage = disk(), runs = new ChapterRuns(storage); victory(runs, chapter.nodes[0]);
  assert.equal(runs.begin(chapter, chapter.nodes[0], party), null);
  runs.begin(chapter, chapter.nodes[1], party);
  const restored = new ChapterRuns(storage); assert.equal(restored.get(chapter, party).status, 'active');
  assert.deepEqual(restored.get(chapter, party).completed, []);
  assert.equal(restored.begin(chapter, chapter.nodes[1], party), null);
  assert.ok(restored.begin(chapter, chapter.nodes[0], party));
});
test('leaving an encounter keeps the current route and carried resources', () => {
  const storage = disk(), runs = new ChapterRuns(storage);
  victory(runs, chapter.nodes[0], 300, 80);
  assert.ok(runs.begin(chapter, chapter.nodes[1], party));
  runs.abandon(chapter);
  const restored = new ChapterRuns(storage);
  assert.deepEqual(restored.get(chapter, party).completed, [chapter.nodes[0].id]);
  assert.equal(restored.get(chapter, party).resources.mana.current, 80);
  assert.equal(encounterState(chapter, restored.get(chapter, party), chapter.nodes[1]), 'available');
});
test('idle map reload preserves the next playable encounter', () => {
  const storage = disk(), runs = new ChapterRuns(storage);
  victory(runs, chapter.nodes[0], 300, 80);
  const restored = new ChapterRuns(storage);
  assert.equal(encounterState(chapter, restored.get(chapter, party), chapter.nodes[1]), 'available');
  assert.equal(restored.begin(chapter, chapter.nodes[1], party).mana.current, 80);
});
test('resource maxima add only positive differences and clamp decreases', () => {
  const resources = fullResources(party); resources.health.tank.current = 300; resources.mana.current = 360;
  const gear = party.map(p => ({ ...p, maxHp: p.maxHp + (p.id === 'tank' ? 100 : 0), ...(p.label === 'HEALER' ? { maxMana: 800 } : {}) }));
  const raised = reconcileResources(resources, gear);
  assert.deepEqual(raised.health.tank, { current: 400, max: 700 }); assert.deepEqual(raised.mana, { current: 560, max: 800 });
  assert.deepEqual(reconcileResources(raised, party).mana, { current: 560, max: 600 });
  raised.mana.current = 790; raised.health.tank.current = 690;
  const lowered = reconcileResources(raised, party); assert.equal(lowered.mana.current, 600); assert.equal(lowered.health.tank.current, 600);
  assert.deepEqual(reconcileResources(lowered, party), lowered);
});
test('chapter completion closes the attempt and chapters retain independent resources', () => {
  const runs = new ChapterRuns(disk());
  for (const node of chapter.nodes) victory(runs, node);
  assert.equal(runs.get(chapter, party).status, 'complete'); assert.equal(runs.begin(chapter, chapter.nodes[0], party), null);
  assert.equal(runs.get(CHAPTERS[1], party).resources.mana.current, 600);
  assert.equal(runs.get(chapter, party).resources.mana.current, 360);
});

test('sequential boss clears unlock each next chapter with a playable first encounter', () => {
  const runs = new ChapterRuns(disk());
  const historical = new Set();
  assert.equal(chapterUnlocked(CHAPTERS[0], historical), true);
  assert.equal(chapterUnlocked(CHAPTERS[1], historical), false);
  for (const [index, current] of CHAPTERS.entries()) {
    // Follow one valid path, adding each victory to the permanent history.
    let next = current.nodes[0];
    while (next) {
      assert.equal(encounterState(current, runs.get(current, party), next), 'available');
      const resources = runs.begin(current, next, party);
      assert.ok(resources);
      const game = new Combat(CHAPTER_ENCOUNTERS[next.encounter]);
      game.reset(undefined, resources); game.status = 'victory';
      assert.equal(runs.finish(current, next, game), true);
      historical.add(next.id);
      next = current.nodes.find(node => encounterState(current, runs.get(current, party), node) === 'available');
    }
    assert.equal(runs.get(current, party).status, 'complete');
    assert.equal(runs.begin(current, current.nodes[0], party), null);
    if (CHAPTERS[index + 1]) {
      const unlocked = CHAPTERS[index + 1];
      assert.equal(chapterUnlocked(unlocked, historical), true);
      assert.equal(encounterState(unlocked, runs.get(unlocked, party), unlocked.nodes[0]), 'available');
      assert.ok(runs.begin(unlocked, unlocked.nodes[0], party));
      runs.abandon(unlocked);
    }
  }
  assert.deepEqual(restoreCampaign([...historical]), historical);
});

test('replay starts at full resources and requires the route again', () => {
  const runs = new ChapterRuns(disk());
  for (const node of chapter.nodes) victory(runs, node);
  const history = new Set(chapter.nodes.map(node => node.id));
  assert.equal(chapterUnlocked(CHAPTERS[1], history), true);
  assert.equal(encounterState(chapter, runs.get(chapter, party), chapter.nodes[0]), 'completed');
  runs.restart(chapter, party);
  assert.deepEqual(runs.get(chapter, party).resources, fullResources(party));
  assert.deepEqual(runs.get(chapter, party).completed, []);
  assert.equal(encounterState(chapter, runs.get(chapter, party), chapter.nodes[0]), 'available');
  for (const node of chapter.nodes.slice(1)) assert.equal(encounterState(chapter, runs.get(chapter, party), node), 'locked');
  assert.equal(runs.begin(chapter, chapter.nodes.at(-1), party), null);
  assert.equal(chapterUnlocked(CHAPTERS[1], history), true);
});

test('stale failed and impossible active saves normalize to playable starts', () => {
  const storage = disk();
  storage.setItem('vesper-chapter-runs-v1', JSON.stringify({
    [CHAPTERS[1].id]: { status: 'failed', completed: ['bog-gate'], resources: null },
    [CHAPTERS[2].id]: { status: 'active', completed: ['missing'], resources: null },
  }));
  const runs = new ChapterRuns(storage);
  const first = runs.get(CHAPTERS[1], party);
  assert.equal(first.status, 'active');
  assert.deepEqual(first.completed, []);
  assert.equal(encounterState(CHAPTERS[1], first, CHAPTERS[1].nodes[0]), 'available');
  assert.equal(runs.get(CHAPTERS[2], party).status, 'pending');
  runs.restart(CHAPTERS[2], party);
  assert.equal(encounterState(CHAPTERS[2], runs.get(CHAPTERS[2], party), CHAPTERS[2].nodes[0]), 'available');
});

test('replay loot preview and reward rolls still exclude owned unique items', () => {
  const node = chapter.nodes[0];
  const pool = eligibleNormalLootForEncounter(node.encounter, [], 'priest');
  assert.ok(pool.length);
  const owned = pool.map(item => item.id);
  assert.deepEqual(eligibleNormalLootForEncounter(node.encounter, owned, 'priest'), []);
  assert.deepEqual(rollNormalLoot(NORMAL_LOOT_TABLES[node.encounter], owned, 'priest', () => .99), []);
});
