import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createEncounterTrackSelector, SOUNDTRACK_MANIFEST, SOUNDTRACK_POOLS } from '../src/soundtrack.js';
import { createMusicController } from '../src/music.js';

const EXPECTED_TRACK_IDS = [
  'ashen-vigil',
  'veil-of-embers',
  'hollow-constellation',
  'blood-in-the-quiet',
  'the-last-lantern',
  'beneath-the-vesper',
];

test('all selected soundtrack manifest paths resolve to local MP3 files', async () => {
  assert.deepEqual(SOUNDTRACK_MANIFEST.map(track => track.id), EXPECTED_TRACK_IDS);

  for (const track of SOUNDTRACK_MANIFEST) {
    assert.match(track.src, /^\/assets\/music\/[a-z-]+\.mp3$/);
    const file = resolve(process.cwd(), `.${track.src}`);
    const [metadata, bytes] = await Promise.all([stat(file), readFile(file)]);
    assert.ok(metadata.size > 1024, `${track.id} asset should not be empty`);
    assert.ok(bytes.subarray(0, 3).equals(Buffer.from('ID3')) || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0), `${track.id} should contain MP3 data`);
  }
});

test('normal selection avoids an immediate repeat and boss selection uses its pool', () => {
  assert.equal(SOUNDTRACK_POOLS.normal.length, 5);
  assert.deepEqual(SOUNDTRACK_POOLS.boss.map(track => track.id), ['beneath-the-vesper']);

  const selector = createEncounterTrackSelector({ random: () => 0 });
  const first = selector.select({ kind: 'normal' });
  const second = selector.select({ kind: 'normal' });
  const boss = selector.select({ kind: 'boss' });
  assert.equal(first.id, 'ashen-vigil');
  assert.notEqual(second.id, first.id);
  assert.equal(boss.id, 'beneath-the-vesper');
});

test('music controller loops the selected boss asset and applies persistent controls', () => {
  const persisted = new Map();
  class FakeAudio {
    constructor() { FakeAudio.instance = this; this.paused = true; this.volume = 1; this.loop = false; this.src = ''; }
    pause() { this.paused = true; }
    load() {}
    play() { this.paused = false; return Promise.resolve(); }
    removeAttribute(name) { if (name === 'src') this.src = ''; }
  }

  const music = createMusicController({
    storage: { getItem: key => persisted.get(key) ?? null, setItem: (key, value) => persisted.set(key, value) },
    AudioClass: FakeAudio,
    fadeInDuration: 0,
  });
  const boss = SOUNDTRACK_POOLS.boss[0];

  assert.equal(music.play(boss), true);
  assert.equal(music.getState().currentTrackId, 'beneath-the-vesper');
  assert.equal(music.getState().playing, true);
  assert.equal(FakeAudio.instance.src, boss.src);
  assert.equal(FakeAudio.instance.loop, true);
  assert.equal(FakeAudio.instance.volume, 0.25);
  music.setVolume(40);
  assert.equal(FakeAudio.instance.volume, 0.4);
  music.setMuted(true);
  assert.equal(FakeAudio.instance.volume, 0);
  assert.deepEqual(JSON.parse(persisted.get('vesper-music-settings-v1')), { volume: 40, muted: true });
});
