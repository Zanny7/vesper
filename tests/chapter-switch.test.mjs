import test from 'node:test';
import assert from 'node:assert/strict';
import { ChapterRuns, encounterState, fullResources } from '../src/chapter-runs.js';
import { chapterSwitchCopy, createChapterSwitch } from '../src/chapter-switch.js';
import { chapterCardAction } from '../src/chapters.js';
import { CHAPTERS, partyForHealer } from '../src/data.js';
import { chapterUnlocked, restoreCampaign } from '../src/progression.js';

const [first, second, third] = CHAPTERS;
const party = partyForHealer('priest');

test('chapter cards distinguish an active replay from an available replay', () => {
  assert.equal(chapterCardAction('completed', second, second), 'Completed · Continue replay');
  assert.equal(chapterCardAction('completed', second, first), 'Completed · Enter to replay');
  assert.equal(chapterCardAction('available', third, third), 'Continue chapter →');
  assert.equal(chapterCardAction('available', third, second), 'Enter chapter →');
  assert.equal(chapterCardAction('locked', third, second), null);
});
const disk = () => { const map = new Map(); return { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value) }; };
function clear(runs, chapter, node, mana = 80) {
  const resources = runs.begin(chapter, node, party);
  assert.ok(resources);
  resources.mana.current = mana;
  assert.equal(runs.finish(chapter, node, { status: 'victory', encounter: { id: node.encounter }, resources: () => resources }), true);
}
function fixture() {
  const storage = disk(), runs = new ChapterRuns(storage);
  for (const node of first.nodes) clear(runs, first, node);
  runs.get(second, party);
  clear(runs, second, second.nodes[0], 75);
  storage.setItem('vesper-campaign-v3', JSON.stringify(first.nodes.map(node => node.id)));
  storage.setItem('vesper-equipment-v2', '{"version":2,"owned":["unique-item"]}');
  storage.setItem('vesper-talents-v1', '{"version":1,"points":3}');
  return { storage, runs };
}
function controller(runs) {
  const shown = [], started = [];
  const control = createChapterSwitch({ runs, getParty: () => party, confirm: request => shown.push(request), onStart: chapter => started.push(chapter.id) });
  return { control, shown, started };
}

test('active Chapter 2 and Replay Chapter 1 shows a clear warning; cancel changes nothing', () => {
  const { storage, runs } = fixture();
  const { control, shown, started } = controller(runs);
  const before = storage.getItem('vesper-chapter-runs-v1');
  assert.equal(control.request(first), 'confirmation');
  assert.deepEqual(shown.map(({ current, next }) => [current.id, next.id]), [[second.id, first.id]]);
  const copy = chapterSwitchCopy(shown[0].current, shown[0].next);
  assert.match(copy.loss, /Chapter 2 run/);
  assert.match(copy.loss, /Health and Mana/);
  assert.match(copy.retained, /completed and unlocked chapters, items, equipment, and talents/);
  control.cancel();
  assert.equal(control.accept(), false);
  assert.equal(storage.getItem('vesper-chapter-runs-v1'), before);
  assert.equal(runs.activeChapter().id, second.id);
  assert.deepEqual(started, []);
});

test('confirm abandons only Chapter 2 run state and starts a clean Chapter 1 replay', () => {
  const { storage, runs } = fixture();
  const permanentKeys = ['vesper-campaign-v3', 'vesper-equipment-v2', 'vesper-talents-v1'];
  const permanent = permanentKeys.map(key => storage.getItem(key));
  const { control, started } = controller(runs);
  assert.equal(control.request(first), 'confirmation');
  assert.equal(control.accept(), true);
  assert.deepEqual(started, [first.id]);
  assert.equal(runs.activeChapter().id, first.id);
  assert.equal(runs.runs[second.id], undefined);
  assert.deepEqual(runs.get(first, party).completed, []);
  assert.deepEqual(runs.get(first, party).resources, fullResources(party));
  assert.equal(encounterState(first, runs.get(first, party), first.nodes[0]), 'available');
  assert.equal(encounterState(first, runs.get(first, party), first.nodes[1]), 'locked');
  assert.deepEqual(permanentKeys.map(key => storage.getItem(key)), permanent);
  assert.equal(chapterUnlocked(second, new Set(first.nodes.map(node => node.id))), true);

  // Returning to the abandoned chapter needs its own confirmed fresh start.
  assert.equal(runs.get(second, party).status, 'pending');
  assert.equal(control.request(second), 'confirmation');
  assert.equal(control.accept(), true);
  assert.equal(runs.activeChapter().id, second.id);
  assert.deepEqual(runs.get(second, party).completed, []);
  assert.deepEqual(runs.get(second, party).resources, fullResources(party));
  assert.equal(encounterState(second, runs.get(second, party), second.nodes[0]), 'available');
});

test('historical Chapter 2 completion and Chapter 3 unlock survive abandoning its replay', () => {
  const { storage, runs } = fixture();
  const history = [...first.nodes, second.nodes[0], second.nodes[1], second.nodes[3], second.nodes[5]].map(node => node.id);
  storage.setItem('vesper-campaign-v3', JSON.stringify(history));
  assert.equal(chapterUnlocked(third, restoreCampaign(history)), true);
  const { control } = controller(runs);
  assert.equal(control.request(first), 'confirmation');
  assert.equal(control.accept(), true);
  assert.deepEqual(JSON.parse(storage.getItem('vesper-campaign-v3')), history);
  assert.equal(chapterUnlocked(third, restoreCampaign(JSON.parse(storage.getItem('vesper-campaign-v3')))), true);
  assert.equal(storage.getItem('vesper-equipment-v2'), '{"version":2,"owned":["unique-item"]}');
  assert.equal(storage.getItem('vesper-talents-v1'), '{"version":1,"points":3}');
});

test('browsing and starting a newly unlocked chapter uses the same confirmation', () => {
  const { storage, runs } = fixture();
  for (const node of [second.nodes[1], second.nodes[3], second.nodes[5]]) clear(runs, second, node);
  const historical = new Set([...first.nodes, second.nodes[0], second.nodes[1], second.nodes[3], second.nodes[5]].map(node => node.id));
  storage.setItem('vesper-campaign-v3', JSON.stringify([...historical]));
  assert.equal(chapterUnlocked(third, restoreCampaign(JSON.parse(storage.getItem('vesper-campaign-v3')))), true);
  runs.restart(first, party);
  const before = storage.getItem('vesper-chapter-runs-v1');
  assert.equal(runs.get(third, party).status, 'pending');
  assert.equal(storage.getItem('vesper-chapter-runs-v1'), before);
  assert.equal(runs.activeChapter().id, first.id);
  const { control, shown } = controller(runs);
  assert.equal(control.request(third), 'confirmation');
  assert.equal(shown[0].current.id, first.id);
  assert.equal(control.accept(), true);
  assert.equal(runs.activeChapter().id, third.id);
  assert.equal(encounterState(third, runs.get(third, party), third.nodes[0]), 'available');
});

test('starting when no other run exists needs no warning', () => {
  const runs = new ChapterRuns(disk());
  const { control, shown } = controller(runs);
  assert.equal(control.request(first), 'started');
  assert.deepEqual(shown, []);
  assert.equal(runs.activeChapter().id, first.id);
  assert.equal(control.request(first), 'started');
  assert.deepEqual(shown, []);
});

test('a historical clear without a saved run stays closed until Replay Chapter', () => {
  const storage = disk(), runs = new ChapterRuns(storage);
  const history = new Set(first.nodes.map(node => node.id));
  assert.equal(runs.get(first, party, chapterUnlocked(second, history)).status, 'complete');
  assert.equal(runs.activeChapter(), null);
  assert.equal(runs.runs[first.id], undefined);
  assert.equal(runs.get(second, party).status, 'active');
  const { control, shown } = controller(runs);
  assert.equal(control.request(first), 'confirmation');
  assert.equal(shown[0].current.id, second.id);
});

test('a historical clear cannot begin an encounter before explicit replay', () => {
  const runs = new ChapterRuns(disk());
  assert.equal(runs.get(first, party, true).status, 'complete');
  assert.equal(runs.begin(first, first.nodes[0], party, true), null);
  assert.equal(runs.activeChapter(), null);
  const { control } = controller(runs);
  assert.equal(control.request(first), 'started');
  assert.ok(runs.begin(first, first.nodes[0], party, true));
});

test('reload deterministically keeps the most progressed legacy active run', () => {
  const storage = disk();
  storage.setItem('vesper-chapter-runs-v1', JSON.stringify({
    [first.id]: { status: 'active', completed: [first.nodes[0].id], resources: fullResources(party), inEncounter: null },
    [second.id]: { status: 'active', completed: [second.nodes[0].id, second.nodes[1].id], resources: fullResources(party), inEncounter: null },
  }));
  storage.setItem('vesper-campaign-v3', '["historical-clear"]');
  const runs = new ChapterRuns(storage);
  assert.equal(runs.activeChapter().id, second.id);
  assert.equal(runs.runs[first.id], undefined);
  assert.equal(runs.get(first, party).status, 'pending');
  assert.equal(new ChapterRuns(storage).activeChapter().id, second.id);
  assert.equal(storage.getItem('vesper-campaign-v3'), '["historical-clear"]');
});

test('automatic failure reset stays on the same chapter without a switch confirmation', () => {
  const runs = new ChapterRuns(disk());
  const { control, shown } = controller(runs);
  assert.equal(control.request(first), 'started');
  const node = first.nodes[0];
  assert.ok(runs.begin(first, node, party));
  assert.equal(runs.finish(first, node, { status: 'defeat', encounter: { id: node.encounter }, partyTemplate: party }), true);
  assert.equal(runs.activeChapter().id, first.id);
  assert.equal(encounterState(first, runs.get(first, party), node), 'available');
  assert.deepEqual(shown, []);
});
