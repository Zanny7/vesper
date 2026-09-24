import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { CHAPTER_ENCOUNTERS, CONFIG, ADVENTURES } from '../src/data.js';

const advance = (game, seconds) => { for (let i = 0; i < seconds / CONFIG.step; i++) game.step(); };
const seeded = seed => () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
function heal(game) {
  if (game.cast) return;
  const living = game.party.filter(p => p.hp > 0), lowest = [...living].sort((a,b) => a.hp/a.maxHp-b.hp/b.maxHp)[0];
  const injured = living.filter(p => p.maxHp-p.hp >= 70), tank = game.party[0];
  if (tank.hp < 360 && (game.cooldowns.penance || 0) <= game.time) game.begin('penance', 'tank');
  else if (lowest.hp / lowest.maxHp < .48) game.begin('flash', lowest.id);
  else if (injured.length >= 3) game.begin('prayer', lowest.id);
  else if (tank.maxHp-tank.hp >= 160) game.begin('greater', 'tank');
  else if (lowest.maxHp-lowest.hp >= 100) game.begin('flash', lowest.id);
}

test('chapter enemies add only light random ranged damage to predictable tank strikes', () => {
  const encounters = ADVENTURES.map(node => CHAPTER_ENCOUNTERS[node.encounter]);
  assert.deepEqual(encounters.map(e => e.adds.length), [0, 1, 2, 2]);
  for (const encounter of encounters) {
    assert.equal(encounter.mechanics.length, 0);
    assert.equal(encounter.shard, undefined);
    for (const add of encounter.adds) assert.ok(add.damage / add.every < encounter.strike.damage / encounter.strike.every * .2);
  }
  assert.ok(encounters[3].strike.damage / encounters[3].strike.every > encounters[2].strike.damage / encounters[2].strike.every * 1.1);
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

test('the first and boss fights require healing, and basic triage wins every Chapter 1 encounter', () => {
  for (const encounter of [CHAPTER_ENCOUNTERS.sentinel, CHAPTER_ENCOUNTERS.warden]) {
    const idle = new Combat(encounter, seeded(1)); idle.start(); advance(idle, 150);
    assert.equal(idle.status, 'defeat', encounter.id);
  }
  for (const encounter of ADVENTURES.map(node => CHAPTER_ENCOUNTERS[node.encounter])) {
    for (let seed = 1; seed <= 30; seed++) {
      const game = new Combat(encounter, seeded(seed)); game.start();
      while (game.status === 'running' && game.time < 150) { heal(game); game.step(); game.drainEvents(); }
      assert.equal(game.status, 'victory', encounter.id + ' seed ' + seed);
      assert.equal(game.stats.deaths, 0, encounter.id + ' seed ' + seed);
      assert.ok(game.time < CONFIG.enrage, encounter.id + ' should finish before enrage');
      assert.ok(game.stats.effective > 0);
    }
  }
});
