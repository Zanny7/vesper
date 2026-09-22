import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { healerBuffs } from '../src/healer-buffs.js';
import { priestTalentLoadout } from '../src/priest-talents.js';
import { PARTY, SPELLS } from '../src/data.js';

const encounter = { name: 'Training', maxHp: 10000, strike: { first: Infinity, every: 1, damage: 0 }, mechanics: [] };

test('healer buff presentation exposes active stack and timed effects generically', () => {
  const game = new Combat(encounter);
  game.buffs.postHaste = 2;
  game.buffs.divineFervor = { target: game.healer.id, speed: .2, expires: 8 };
  assert.deepEqual(healerBuffs(game).map(buff => [buff.id, buff.stacks, buff.remaining]), [
    ['postHaste', 2, null], ['divineFervor', undefined, 8],
  ]);
  game.time = 9;
  assert.deepEqual(healerBuffs(game).map(buff => buff.id), ['postHaste']);
});

test('cancelling a Post-Haste cast returns its reserved stack and spends no Mana', () => {
  const loadout = priestTalentLoadout(PARTY, SPELLS, { 'post-haste': 2 });
  const game = new Combat(encounter, Math.random, loadout.party, loadout.spells);
  game.start(); game.buffs.postHaste = 2;
  const mana = game.mana;
  assert.equal(game.begin('greater', 'tank').ok, true);
  assert.equal(game.buffs.postHaste, 1);
  game.cancel();
  assert.equal(game.buffs.postHaste, 2);
  assert.equal(game.mana, mana);
});
