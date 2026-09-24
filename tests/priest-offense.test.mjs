import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { CONFIG } from '../src/data.js';

const encounter = { name: 'Training', maxHp: 10000, strike: { first: Infinity, every: 3, damage: 0 }, mechanics: [] };
const advance = (game, seconds) => { for (let i = 0; i < Math.round(seconds / CONFIG.step); i++) game.step(); };
function setup() { const game = new Combat(encounter); game.start(); game.party.forEach(member => member.nextAttack = Infinity); return game; }
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('Smite costs 4 mana on completion, lands after 1.5s, and Atonement heals lowest health percentage', () => {
  const game = setup(); game.party[0].hp = 400; game.party[1].hp = 200; game.party[4].hp = 180;
  assert.equal(game.begin('smite', 'tank').ok, true); assert.equal(game.mana, CONFIG.mana);
  advance(game, 1.5);
  assert.equal(game.mana, CONFIG.mana - 4);
  assert.equal(game.boss.hp, encounter.maxHp - 2.5);
  assert.equal(game.party[4].hp, 182.5); // Priest is the most injured by Health percentage.
  assert.equal(game.cooldowns.smite, undefined);
});

test('Atonement includes the Priest, ignores companion attacks, and is wasted at full health', () => {
  const game = setup(); game.party[4].hp = 100;
  game.damageEnemy(10, 'test'); assert.equal(game.party[4].hp, 110);
  game.party.forEach(member => member.hp = member.maxHp); const heals = game.events.filter(event => event.type === 'heal').length;
  game.damageEnemy(10, 'test'); assert.equal(game.events.filter(event => event.type === 'heal').length, heals);
  game.party[0].hp -= 10; game.party[1].nextAttack = game.time; game.party[1].damage = 10; game.step();
  assert.equal(game.party[0].hp, game.party[0].maxHp - 10);
});

test('Penance heals allies or deals two hostile bolts and triggers Atonement', () => {
  const friendly = setup(); friendly.party[0].hp = 100; friendly.begin('penance', 'tank'); advance(friendly, 2);
  assert.equal(friendly.party[0].hp, 220); assert.equal(friendly.boss.hp, encounter.maxHp);
  const hostile = setup(); hostile.party[4].hp = 100; hostile.begin('penance', 'boss'); advance(hostile, 2);
  assert.equal(hostile.boss.hp, encounter.maxHp - 30); assert.equal(hostile.party[4].hp, 130);
  assert.equal(hostile.events.filter(event => event.type === 'damage' && event.target === 'boss').length, 2);
});

test('Holy Fire deals 3 plus five ticks totaling 7 and every hit triggers Atonement', () => {
  const game = setup(); game.party[4].hp = 100;
  assert.equal(game.begin('holyFire', 'tank').ok, true); assert.equal(game.mana, CONFIG.mana - 8);
  assert.equal(game.boss.hp, encounter.maxHp - 3); assert.equal(game.party[4].hp, 103);
  advance(game, 10);
  close(game.boss.hp, encounter.maxHp - 10);
  assert.equal(game.events.filter(event => event.type === 'damage' && event.target === 'boss' && event.source === 'holyFire').length, 6);
  close(game.events.filter(event => event.type === 'damage' && event.target === 'boss' && event.source === 'holyFire').reduce((sum, event) => sum + event.amount, 0), 10);
  assert.ok(Math.abs(game.party[4].hp - 110) < 1e-8);
  assert.equal(game.boss.dots.length, 0);
});

test('Holy Fire rollover preserves all pending damage and redistributes the combined pool', () => {
  const game = setup(); game.party[4].hp = 1; game.begin('holyFire', 'boss'); advance(game, 6);
  close(game.boss.hp, encounter.maxHp - 7.2); // 3 direct + three 1.4-damage ticks.
  game.cooldowns.holyFire = 0; game.begin('holyFire', 'boss');
  assert.equal(game.boss.dots[0].remaining, 9.8); // 2.8 pending + a fresh 7.
  advance(game, 10);
  close(game.boss.hp, encounter.maxHp - 20); // First direct/ticks + second direct + full rollover pool.
  assert.equal(game.events.filter(event => event.type === 'damage' && event.source === 'holyFire').length, 10);
});
