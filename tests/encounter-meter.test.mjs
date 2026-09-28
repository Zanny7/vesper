import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { EncounterMeter } from '../src/encounter-meter.js';

test('damage meter credits the actor, caps overkill, and retains all five sorted rows', () => {
  const game = new Combat();
  const meter = new EncounterMeter(game.party);
  game.boss.hp = 12;
  game.damageEnemy(30, 'smite', false, game.party[1]);
  meter.consume(game.drainEvents());
  const rows = meter.damageRows(3);
  assert.deepEqual(rows.map(row => row.id), ['rogue', 'tank', 'mage', 'ranger', 'priest']);
  assert.equal(rows[0].amount, 12);
  assert.equal(rows[0].perSecond, 4);
  assert.equal(meter.totalDamage, 12);
  assert.ok(rows.slice(1).every(row => row.amount === 0));
});

test('positive damage ties keep party order regardless of event order', () => {
  const game = new Combat();
  const meter = new EncounterMeter(game.party);
  meter.consume([
    { type: 'damage', target: 'boss', actor: 'mage', amount: 25 },
    { type: 'damage', target: 'boss', actor: 'ranger', amount: 30 },
    { type: 'damage', target: 'boss', actor: 'tank', amount: 25 },
    { type: 'damage', target: 'boss', actor: 'rogue', amount: 10 },
  ]);
  assert.deepEqual(meter.damageRows(5).map(row => row.id), ['ranger', 'tank', 'mage', 'rogue', 'priest']);
  assert.deepEqual(meter.damageRows(5).slice(1, 3).map(row => row.perSecond), [5, 5]);
});

test('healing meter uses effective amounts and sorts spell and effect details', () => {
  const game = new Combat();
  const meter = new EncounterMeter(game.party);
  game.party[0].hp = game.party[0].maxHp - 12;
  game.heal(game.party[0], 100, 'flash', { canCrit: false });
  game.party[1].hp = game.party[1].maxHp - 8;
  game.heal(game.party[1], 8, 'atonement', { canCrit: false });
  game.heal(game.party[1], 50, 'greater', { canCrit: false });
  meter.consume(game.drainEvents());
  assert.equal(game.stats.overheal, 138);
  assert.equal(meter.totalHealing, 20);
  assert.deepEqual(meter.healingRows(4, game.spells).map(row => [row.name, row.amount, row.perSecond]), [
    ['Flash Heal', 12, 3], ['Atonement', 8, 2],
  ]);
});

test('rates use active encounter time and freeze while paused or ended', () => {
  const game = new Combat();
  const meter = new EncounterMeter(game.party);
  game.start();
  game.damageEnemy(10, 'tank', false, game.party[0]);
  meter.consume(game.drainEvents());
  game.step(2);
  const activeRate = meter.damageRows(game.time)[0].perSecond;
  game.pause(); game.step(30);
  assert.equal(game.time, 2);
  assert.equal(meter.damageRows(game.time)[0].perSecond, activeRate);
  game.pause(); game.boss.hp = 0; game.step();
  const endTime = game.time;
  game.step(30);
  assert.equal(game.time, endTime);
  assert.equal(meter.damageRows(game.time)[0].perSecond, 10 / endTime);
  meter.reset(game.party);
  assert.equal(meter.totalDamage, 0);
  assert.equal(meter.damageRows(0).length, 5);
});
