import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, ERAS, CHAPTER_ENCOUNTERS, GEAR, CONFIG, partyForHealer } from '../src/data.js';
import { eraUnlocked, eraForChapter, chaptersForEra, itemEraLabel, itemBorderAttributes } from '../src/eras.js';
import { restoreCampaign, chapterUnlocked, nodeState, awardVictory } from '../src/progression.js';
import { ChapterRuns, encounterState } from '../src/chapter-runs.js';
import { Combat } from '../src/combat.js';
import { validateCatalogue } from '../src/item-model.js';
import { equipmentSlot, itemDetails } from '../src/equipment.js';
import { encounterLootMarkup } from '../src/loot-presentation.js';
import { buildNormalLootTables, NORMAL_LOOT_TABLES, BOSS_BONUS_LOOT_TABLES } from '../src/loot.js';
import { clearVesperLocalState } from '../src/hard-reset.js';

const disk = () => { const data = new Map(); return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }; };
const firstRoute = chapter => {
  const path = []; let node = chapter.nodes[0];
  while (node) { path.push(node); node = chapter.nodes.find(next => next.from.includes(node.id)); }
  return path;
};
const oldHistory = () => CHAPTERS.slice(0, 4).flatMap(chapter => firstRoute(chapter).map(node => node.id));
const party = partyForHealer('shaman');

test('Chapter 4 boss permanently unlocks Era II, including old saves and older replays', () => {
  const saved = oldHistory(), boss = CHAPTERS[3].nodes.at(-1);
  const before = restoreCampaign(saved.filter(id => id !== boss.id));
  assert.equal(eraUnlocked(ERAS[1], before), false);
  assert.equal(chapterUnlocked(CHAPTERS[4], before), false);
  assert.equal(awardVictory(before, boss.id, { status: 'victory', encounter: CHAPTER_ENCOUNTERS[boss.encounter] }, CHAPTERS[3].nodes), true);
  assert.equal(eraUnlocked(ERAS[1], before), true);
  assert.equal(chapterUnlocked(CHAPTERS[4], before), true);
  assert.equal(chapterUnlocked(CHAPTERS[5], before), false);
  const reloaded = restoreCampaign(JSON.parse(JSON.stringify([...before])));
  assert.deepEqual(reloaded, restoreCampaign(saved));
  const runs = new ChapterRuns(disk()); runs.restart(CHAPTERS[0], party);
  assert.equal(eraUnlocked(ERAS[1], reloaded), true);
  assert.deepEqual(chaptersForEra(ERAS[0]), CHAPTERS.slice(0, 4));
  assert.deepEqual(chaptersForEra(ERAS[1]), CHAPTERS.slice(4));
  for (const chapter of CHAPTERS) assert.ok(eraForChapter(chapter));
  assert.equal(restoreCampaign([boss.id]).size, 0, 'orphan boss IDs do not bypass normal save validation');
  const storage = disk(); storage.setItem('vesper-campaign-v3', JSON.stringify(saved));
  assert.equal(clearVesperLocalState(storage).ok, true);
  assert.equal(eraUnlocked(ERAS[1], restoreCampaign(JSON.parse(storage.getItem('vesper-campaign-v3') ?? 'null'))), false);
});

test('Era II maps mix two and three choices with optional elites and non-combat routes', () => {
  for (const chapter of CHAPTERS.slice(4)) {
    const degrees = chapter.nodes.map(node => chapter.nodes.filter(next => next.from.includes(node.id)).length);
    assert.ok(degrees.includes(2)); assert.equal(degrees.filter(degree => degree === 3).length, 1);
    assert.ok(degrees.every(degree => degree <= 3));
    const fork = chapter.nodes.find(node => chapter.nodes.filter(next => next.from.includes(node.id)).length === 3);
    const choices = chapter.nodes.filter(node => node.from.includes(fork.id));
    assert.deepEqual(choices.map(node => node.kind), ['normal', 'elite', 'shrine']);
    for (const choice of choices) {
      const history = new Set(chapter.nodes.filter(node => node.x <= fork.x).map(node => node.id));
      assert.equal(nodeState(choice, history), 'available');
    }
    assert.equal(chapter.modifiers.length, 0);
    assert.deepEqual(chapter.encounterDurationTarget, [90, 180]);
  }
});

test('utility visits persist once per run and preserve wounded resources without combat recovery', () => {
  for (const chapter of CHAPTERS.slice(4)) {
    const storage = disk(), runs = new ChapterRuns(storage), shrine = chapter.nodes.find(node => node.kind === 'shrine');
    const run = runs.restart(chapter, party);
    run.completed = chapter.nodes.filter(node => node.x < shrine.x).map(node => node.id);
    run.resources.mana.current = 123; run.resources.health.tank.current = 200; runs.save();
    const resources = structuredClone(run.resources);
    assert.equal(encounterState(chapter, run, shrine), 'available');
    assert.equal(runs.begin(chapter, shrine, party), null, 'utility never starts Combat');
    assert.equal(runs.visit(chapter, shrine, party), true);
    assert.deepEqual(run.resources, resources); assert.equal(run.inEncounter, null);
    assert.equal(runs.visit(chapter, shrine, party), false);
    const loaded = new ChapterRuns(storage).get(chapter, party);
    assert.ok(loaded.completed.includes(shrine.id)); assert.deepEqual(loaded.resources, resources);
    assert.ok(chapter.nodes.some(node => node.from.includes(shrine.id) && encounterState(chapter, loaded, node) === 'available'));
    assert.equal(runs.visit(CHAPTERS[0], shrine, party), false);
  }
});

test('all existing gear is silver Era I and future Era II gear uses the same green surfaces', () => {
  for (const item of GEAR) {
    assert.equal(itemEraLabel(item), 'Era I');
    assert.match(itemBorderAttributes(item), /--item-era-border:#aab2b9/);
    assert.match(itemDetails(item), /Era I/);
  }
  const future = { ...GEAR[0], id: 'future-emerald-item', chapter: 5 };
  assert.deepEqual(validateCatalogue([future]), []);
  assert.equal(itemEraLabel(future), 'Era II');
  for (const markup of [equipmentSlot({ id: 'shaman' }, future.slot, future, false), encounterLootMarkup([future])]) {
    assert.match(markup, /data-era="era-2"/); assert.match(markup, /--item-era-border:#78be87/);
  }
  assert.match(itemDetails(future), /Era II/);
  const chapter = CHAPTERS[4], tables = buildNormalLootTables([chapter], [future]);
  assert.ok(Object.values(tables).some(table => table.includes(future.id)), 'chapter ownership works when passed a subset');
  assert.equal(Object.hasOwn(tables, 'null'), false, 'shrines do not get combat loot tables');
  for (const shell of CHAPTERS.slice(4)) for (const node of shell.nodes) {
    if (node.encounter) assert.deepEqual(NORMAL_LOOT_TABLES[node.encounter], []);
    if (node.kind === 'boss') assert.deepEqual(BOSS_BONUS_LOOT_TABLES[node.encounter], []);
  }
});

test('shell fights copy existing profiles without tuning, and later fights may override enrage', () => {
  const profile = encounter => ({ maxHp: encounter.maxHp, strike: encounter.strike, mechanics: encounter.mechanics, adds: encounter.adds });
  for (const chapter of CHAPTERS.slice(4)) for (const node of chapter.nodes.filter(node => node.encounter)) {
    const encounter = CHAPTER_ENCOUNTERS[node.encounter];
    assert.ok(['huntsman', 'roses', 'chapel', 'duchess'].some(id => JSON.stringify(profile(encounter)) === JSON.stringify(profile(CHAPTER_ENCOUNTERS[id]))));
    assert.equal(encounter.enrageSeconds, undefined);
  }
  for (const seconds of [undefined, 180]) {
    const encounter = { ...structuredClone(CHAPTER_ENCOUNTERS.sentinel), maxHp: 1e9, enrageSeconds: seconds };
    const game = new Combat(encounter); game.start(); game.nextStrike = Infinity;
    game.time = CONFIG.enrage; game.step();
    assert.equal(game.status, seconds ? 'running' : 'defeat');
    if (seconds) { game.time = seconds; game.step(); assert.equal(game.status, 'defeat'); }
  }
});
