import test from 'node:test';
import assert from 'node:assert/strict';
import { chapterManaText } from '../src/adventures.js';
import { ChapterRuns } from '../src/chapter-runs.js';
import { CHAPTERS, CHAPTER_ENCOUNTERS, CONFIG, partyForHealer } from '../src/data.js';
import { Combat } from '../src/combat.js';
import { clearVesperLocalState } from '../src/hard-reset.js';

const disk = () => {
  const values = new Map();
  return { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
};

test('map Mana follows real victory persistence, reload, gear reconciliation, and restart', () => {
  const storage = disk(), chapter = CHAPTERS[0], party = partyForHealer('shaman');
  let runs = new ChapterRuns(storage);
  assert.equal(chapterManaText(runs.get(chapter, party)), 'Mana 600 / 600');
  const resources = runs.begin(chapter, chapter.nodes[0], party);
  const game = new Combat(CHAPTER_ENCOUNTERS.sentinel, () => .5, party);
  game.reset(undefined, resources); game.mana = 123.25; game.status = 'victory';
  assert.ok(runs.finish(chapter, chapter.nodes[0], game));
  const expected = `Mana ${Math.round(123.25 + 600 * CONFIG.encounterManaRecovery)} / 600`;
  assert.equal(chapterManaText(runs.get(chapter, party)), expected);
  runs = new ChapterRuns(storage);
  assert.equal(chapterManaText(runs.get(chapter, partyForHealer('druid'))), expected);
  const geared = party.map(p => p.label === 'HEALER' ? { ...p, maxMana: 780 } : p);
  assert.equal(chapterManaText(runs.get(chapter, geared)), `Mana ${Math.round(303.25 + 600 * CONFIG.encounterManaRecovery)} / 780`);
  runs.runs[chapter.id].resources.mana.current = 420.4;
  assert.equal(chapterManaText(runs.get(chapter, geared)), 'Mana 420 / 780');
  runs.restart(chapter, geared);
  assert.equal(chapterManaText(runs.get(chapter, geared)), 'Mana 780 / 780');
});

test('map Mana hides unstarted previews and hard reset discards stale resources', () => {
  const storage = disk(), party = partyForHealer('shaman'), runs = new ChapterRuns(storage);
  runs.get(CHAPTERS[0], party).resources.mana.current = 11;
  runs.save();
  assert.equal(chapterManaText(runs.get(CHAPTERS[1], party)), '');
  assert.equal(chapterManaText(runs.get(CHAPTERS[1], party, true)), '');
  assert.ok(clearVesperLocalState(storage).ok);
  assert.equal(chapterManaText(new ChapterRuns(storage).get(CHAPTERS[0], party)), 'Mana 600 / 600');
});
