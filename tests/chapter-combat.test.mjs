import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { CHAPTER_ENCOUNTERS, CONFIG, CHAPTERS, HEALERS, partyForHealer } from '../src/data.js';
import { pressureRoute } from '../scripts/encounter-pressure.mjs';

const advance = (game, seconds) => { for (let i = 0; i < seconds / CONFIG.step; i++) game.step(); };
const seeded = seed => () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };

test('Chapter 1 normal route pressure escalates through HP, strike cadence, and adds', () => {
  const encounters = CHAPTERS[0].nodes.filter(node => node.kind === 'normal')
    .map(node => CHAPTER_ENCOUNTERS[node.encounter]);
  assert.ok(encounters[0].maxHp < encounters[1].maxHp && encounters[1].maxHp < encounters[2].maxHp);
  const pressure = encounter => encounter.strike.damage / encounter.strike.every
    + encounter.adds.reduce((sum, add) => sum + add.damage / add.every, 0);
  assert.ok(pressure(encounters[0]) < pressure(encounters[1]));
  assert.ok(pressure(encounters[1]) < pressure(encounters[2]));
  for (const encounter of encounters) {
    for (const add of encounter.adds) {
      assert.ok(add.damage > 0);
      assert.ok(add.every > 0);
    }
  }
  assert.ok(CHAPTER_ENCOUNTERS.warden.maxHp > encounters[2].maxHp);
  assert.ok(CHAPTER_ENCOUNTERS.warden.mechanics.some(m => m.target === 'tank' && m.damage > encounters[2].strike.damage));
});

test('ranged adds select randomly among all living members, including tank and healer', () => {
  for (let index = 0; index < 5; index++) {
    const game = new Combat(CHAPTER_ENCOUNTERS.keeper, () => (index + .1) / 5);
    game.start(); game.nextStrike = Infinity; game.party.forEach(p => p.nextAttack = Infinity);
    advance(game, 4.1);
    assert.equal(game.party[index].hp, game.party[index].maxHp - CHAPTER_ENCOUNTERS.keeper.adds[0].damage);
    assert.equal(game.events.find(e => e.type === 'rangedAttack').target, game.party[index].id);
  }
  const game = new Combat(CHAPTER_ENCOUNTERS.watcher, () => .3);
  game.start(); game.nextStrike = Infinity; game.party[1].hp = 0;
  advance(game, 6.1);
  assert.equal(game.party[2].hp, game.party[2].maxHp - 2 * CHAPTER_ENCOUNTERS.watcher.adds[0].damage);
  assert.equal(game.party[1].hp, 0);
});

test('add timers freeze on pause, reset with the selected encounter, and stop on victory', () => {
  const game = new Combat(CHAPTER_ENCOUNTERS.watcher, () => .9);
  game.start(); advance(game, 3); game.pause();
  const before = JSON.stringify(game); advance(game, 10);
  assert.equal(JSON.stringify(game), before);
  game.pause(); advance(game, 1.1);
  assert.equal(game.party[4].hp, game.party[4].maxHp - CHAPTER_ENCOUNTERS.watcher.adds[0].damage);
  game.boss.hp = 0; game.drainEvents(); game.step();
  const hp = game.party.map(p => p.hp); advance(game, 10);
  assert.deepEqual(game.party.map(p => p.hp), hp);
  game.reset();
  assert.equal(game.encounter.id, 'watcher');
  assert.deepEqual(game.adds.map(a => a.next), [4, 6]);
  assert.equal(game.boss.hp, CHAPTER_ENCOUNTERS.watcher.maxHp);
  assert.equal(game.party[4].hp, 400);
  game.reset(CHAPTER_ENCOUNTERS.sentinel);
  assert.equal(game.adds.length, 0);
});

test('Chapter 1 requires healing and a geared Shaman can complete the persistent route', () => {
  for (const encounter of [CHAPTER_ENCOUNTERS.sentinel, CHAPTER_ENCOUNTERS.warden]) {
    const idle = new Combat(encounter, seeded(1)); idle.start(); advance(idle, 150);
    assert.equal(idle.status, 'defeat', encounter.id);
  }
  const attempts = Array.from({ length: 8 }, (_, i) => pressureRoute(1, 0, i, i % 2 ? '1-reserves' : '1-deep', 'ready', 'veryGood'));
  const wins = attempts.filter(r => r.won && r.encounters.every(e => e.deaths === 0));
  assert.ok(wins.length >= 4, 'both legal builds have reproducible, death-free route clears with actual loot');
  for (const route of wins) {
    assert.equal(route.encounters.length, 4);
    assert.ok(route.encounters.every(e => e.seconds < CONFIG.enrage && e.effectiveHealing > 0));
    assert.ok(route.encounters.at(-1).seconds > Math.max(...route.encounters.slice(0, -1).map(e => e.seconds)));
  }
});

test('a warned party hit is lethal at 30% Health and survivable when prepared', () => {
  for (const health of [.30, .60]) {
    const encounter = structuredClone(CHAPTER_ENCOUNTERS.moth);
    encounter.maxHp = 1e8; encounter.strike.first = Infinity;
    const game = new Combat(encounter, seeded(91), partyForHealer('shaman'), HEALERS.shaman.combatSpells);
    game.party[1].hp = game.party[1].maxHp * health;
    game.start(); advance(game, encounter.mechanics[0].first + .1);
    assert.equal(game.party[1].hp === 0, health === .30);
    assert.equal(game.stats.deaths, health === .30 ? 1 : 0);
  }
});
