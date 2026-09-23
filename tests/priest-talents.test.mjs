import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { CONFIG, partyForHealer, SPELLS } from '../src/data.js';
import { priestTalentLoadout } from '../src/priest-talents.js';

const encounter = { name: 'Training', maxHp: 100000, strike: { first: Infinity, every: 3, damage: 0 }, mechanics: [] };
const advance = (game, seconds) => { for (let step = 0; step < Math.round(seconds / CONFIG.step); step++) game.step(); };
const setup = allocations => {
  const loadout = priestTalentLoadout(partyForHealer('priest'), SPELLS, allocations);
  const game = new Combat(encounter, () => 0, loadout.party, loadout.spells);
  game.start(); game.party.forEach(member => { member.hp = 1; member.nextAttack = Infinity; });
  return game;
};

test('Priest row 1 derives mana regeneration, Flash Heal cost, and Greater Heal cast time by rank', () => {
  const one = priestTalentLoadout(partyForHealer('priest'), SPELLS, {
    'conservation-of-faith': 1, 'quick-remedy': 1, 'measured-casting': 1,
  });
  const two = priestTalentLoadout(partyForHealer('priest'), SPELLS, {
    'conservation-of-faith': 2, 'quick-remedy': 2, 'measured-casting': 2,
  });
  assert.equal(one.party.at(-1).manaRegen, 2.2); assert.equal(two.party.at(-1).manaRegen, 2.4);
  assert.equal(one.spells.find(spell => spell.id === 'flash').cost * CONFIG.baseMana, 27);
  assert.equal(two.spells.find(spell => spell.id === 'flash').cost * CONFIG.baseMana, 24);
  assert.equal(one.spells.find(spell => spell.id === 'greater').cast, 2.8);
  assert.equal(two.spells.find(spell => spell.id === 'greater').cast, 2.5);
});

test('Post-Haste stores up to its rank and consumes exactly one stack for an 80% Greater Heal or Prayer', () => {
  const game = setup({ 'post-haste': 2 });
  for (let index = 0; index < 2; index++) {
    assert.ok(game.begin('flash', 'tank').ok); advance(game, 1.5);
  }
  assert.equal(game.buffs.postHaste, 2);
  const mana = game.mana;
  assert.ok(game.begin('greater', 'tank').ok); assert.ok(Math.abs(game.cast.duration - 2.4) < 1e-8);
  assert.equal(game.mana, mana); assert.equal(game.cast.manaCost, 36); assert.equal(game.buffs.postHaste, 1);
  advance(game, 2.4);
  const prayerMana = game.mana;
  assert.ok(game.begin('prayer', 'tank').ok); assert.ok(Math.abs(game.cast.duration - 2.4) < 1e-8);
  assert.equal(game.mana, prayerMana); assert.equal(game.cast.manaCost, 60); assert.equal(game.buffs.postHaste, undefined);
  advance(game, 2.4); assert.ok(Math.abs(game.mana - (prayerMana + 2.4 * game.healer.manaRegen - 60)) < 1e-8);
});

test('Focused Penance and Lingering Prayer use the requested cooldown and refresh-only derived HoT', () => {
  const game = setup({ 'focused-penance': 2, 'lingering-prayer': 1 });
  assert.ok(game.begin('penance', 'tank').ok); assert.equal(game.cooldowns.penance, 8); advance(game, 2);
  assert.ok(game.begin('prayer', 'tank').ok); advance(game, 3);
  for (const ally of game.party) {
    const hot = ally.hots.find(effect => effect.source === 'lingering-prayer');
    assert.equal(hot.heal, 100 * .2 / 3); assert.equal(hot.ticks, 3);
  }
  advance(game, 2); assert.equal(game.party[0].hp, 1 + 120 + 100 + 100 * .2 / 3);
  const previous = game.party[0].hots.find(effect => effect.source === 'lingering-prayer');
  assert.ok(game.begin('prayer', 'tank').ok); advance(game, 3);
  assert.equal(game.party[0].hots.filter(effect => effect.source === 'lingering-prayer').length, 1);
  assert.ok(game.party[0].hots[0].expires > previous.expires);
});

test('Threefold Penance adds a third main bolt and smart-heals the current lowest-percent other ally', () => {
  const friendly = setup({ 'threefold-penance': 1 });
  friendly.party.forEach(member => member.hp = member.maxHp);
  friendly.party[0].hp = 100; friendly.party[1].hp = 100; friendly.party[2].hp = 120;
  assert.ok(friendly.begin('penance', 'tank').ok); advance(friendly, 1.5);
  friendly.party[2].hp = 1; advance(friendly, .5);
  assert.equal(friendly.party[0].hp, 280);
  assert.equal(friendly.party[2].hp, 61);
  assert.equal(friendly.events.filter(event => event.type === 'heal' && event.spell === 'penance').length, 3);
  const hostile = setup({ 'threefold-penance': 1 });
  hostile.party.forEach(member => member.hp = member.maxHp); hostile.party[4].hp = 1;
  assert.ok(hostile.begin('penance', 'boss').ok); advance(hostile, 2);
  assert.equal(hostile.boss.hp, encounter.maxHp - 45);
  assert.equal(hostile.party[4].hp, 79);
});

test('Echo of Grace heals the lowest-percent wounded ally other than the primary target', () => {
  const game = setup({ 'echo-of-grace': 1 });
  game.party.forEach(member => member.hp = member.maxHp);
  game.party[0].hp = 100; game.party[1].hp = 200; game.party[4].hp = 90;
  assert.ok(game.begin('flash', 'tank').ok); advance(game, 1.5);
  assert.equal(game.party[0].hp, 200);
  assert.equal(game.party[4].hp, 110);
  assert.ok(game.begin('greater', 'tank').ok); advance(game, 3);
  assert.equal(game.party[4].hp, 150);
});

test('Light Unspent redistributes half of direct Prayer overhealing once and excludes Lingering Prayer', () => {
  const game = setup({ 'light-unspent': 1, 'lingering-prayer': 1 });
  game.party.forEach(member => member.hp = member.maxHp);
  game.party[0].hp -= 300; game.party[1].hp -= 50;
  assert.ok(game.begin('prayer', 'tank').ok); advance(game, 3);
  assert.equal(game.party[0].hp, game.party[0].maxHp - 25);
  assert.equal(game.party[1].hp, game.party[1].maxHp);
  const redistributions = game.events.filter(event => event.type === 'heal' && event.spell === 'light-unspent');
  assert.equal(redistributions.length, 1);
  assert.equal(redistributions[0].raw, 175);
  advance(game, 2);
  assert.equal(game.party[0].hp, game.party[0].maxHp - 25 + 100 * .2 / 3);
  assert.equal(game.events.filter(event => event.spell === 'light-unspent').length, 1);
});

test('row 3 mechanics compose without enabling any row 4 behavior', () => {
  const game = setup({ 'threefold-penance': 1, 'echo-of-grace': 1, 'light-unspent': 1, 'lingering-prayer': 1 });
  const penance = game.spells.find(spell => spell.id === 'penance');
  assert.equal(penance.ticks.length, 3);
  assert.equal(penance.charges, undefined);
  assert.equal(game.spells.some(spell => spell.divineAegis || spell.archangel), false);
});

test('Twin Penance banks two charges and recharges one at a time at the Focused Penance rate', () => {
  const game = setup({ 'focused-penance': 2, 'twin-penance': 1 });
  assert.equal(game.availableCharges('penance'), 2);
  assert.ok(game.begin('penance', 'tank').ok); assert.equal(game.availableCharges('penance'), 1); advance(game, 2);
  assert.ok(game.begin('penance', 'tank').ok); assert.equal(game.availableCharges('penance'), 0); advance(game, 2);
  assert.equal(game.begin('penance', 'tank').ok, false);
  advance(game, 4); assert.ok(Math.abs(game.time - 8) < 1e-8); assert.equal(game.availableCharges('penance'), 1);
  assert.ok(game.begin('penance', 'tank').ok); assert.equal(game.availableCharges('penance'), 0); advance(game, 8);
  assert.equal(game.availableCharges('penance'), 1); advance(game, 8);
  assert.equal(game.availableCharges('penance'), 2); assert.equal(game.cooldowns.penance, undefined);
});

test('Sanctuary reduces every incoming damage type by 20% for 10 seconds only', () => {
  const game = setup({ sanctuary: 1 });
  assert.ok(game.begin('sanctuary', 'tank').ok);
  const tank = game.party[0]; tank.hp = tank.maxHp;
  for (const type of ['Physical', 'Magic', 'Holy']) game.damage(tank, 10, 'test', type);
  assert.equal(tank.hp, tank.maxHp - 24);
  advance(game, 10); game.damage(tank, 10, 'test', 'Holy');
  assert.equal(tank.hp, tank.maxHp - 34);
  assert.equal(game.begin('sanctuary', 'tank').ok, false);
});

test('Divine Fervor grants healer Haste or companion Attack Speed for 20 seconds', () => {
  const healerGame = setup({ 'divine-fervor': 1 });
  assert.ok(healerGame.begin('divineFervor', 'priest').ok);
  assert.ok(healerGame.begin('greater', 'tank').ok);
  assert.equal(healerGame.cast.duration, 2.5);
  advance(healerGame, 2.5);
  healerGame.cooldowns.penance = 0; healerGame.party[1].hp = 1;
  assert.ok(healerGame.begin('penance', 'rogue').ok); assert.ok(Math.abs(healerGame.cast.duration - 2 / 1.2) < 1e-8);
  advance(healerGame, 1.7); assert.equal(healerGame.party[1].hp, 121);
  advance(healerGame, 20 - 2.5 - 1.7); assert.equal(healerGame.haste(), 0);
  const companionGame = setup({ 'divine-fervor': 1 });
  const rogue = companionGame.party[1]; rogue.nextAttack = rogue.interval;
  assert.ok(companionGame.begin('divineFervor', 'rogue').ok);
  assert.equal(rogue.nextAttack, rogue.interval / 1.2);
  advance(companionGame, 10);
  assert.equal(companionGame.events.filter(event => event.type === 'attack' && event.source === 'rogue').length, 8);
  advance(companionGame, 10); assert.equal(rogue.attackSpeedBuff, undefined);
  assert.equal(companionGame.begin('divineFervor', 'rogue').ok, false);
});

test('row 4 talents expose only their selected active abilities and preserve rows 1–3', () => {
  const loadout = priestTalentLoadout(partyForHealer('priest'), SPELLS, {
    'quick-remedy': 2, 'threefold-penance': 1, sanctuary: 1, 'divine-fervor': 1,
  });
  assert.equal(loadout.spells.find(spell => spell.id === 'flash').cost * CONFIG.baseMana, 24);
  assert.equal(loadout.spells.find(spell => spell.id === 'penance').ticks.length, 3);
  assert.deepEqual(loadout.spells.slice(-2).map(spell => [spell.id, spell.key]), [['sanctuary', '7'], ['divineFervor', '8']]);
  assert.equal(priestTalentLoadout(partyForHealer('priest'), SPELLS, {}).spells.some(spell => ['sanctuary', 'divineFervor'].includes(spell.id)), false);
});
