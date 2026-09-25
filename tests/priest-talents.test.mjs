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

test('Priest row 1 derives mana regeneration, Binding Light, and Early Mercy by rank', () => {
  const one = priestTalentLoadout(partyForHealer('priest'), SPELLS, {
    'conservation-of-faith': 1, 'binding-light': 1, 'early-mercy': 1,
  });
  const two = priestTalentLoadout(partyForHealer('priest'), SPELLS, {
    'conservation-of-faith': 2, 'binding-light': 2, 'early-mercy': 2,
  });
  assert.equal(one.party.at(-1).manaRegen, 2.2); assert.equal(two.party.at(-1).manaRegen, 2.4);
  assert.equal(one.spells.find(spell => spell.id === 'flash').bindingLight.ratio, .15);
  assert.equal(two.spells.find(spell => spell.id === 'flash').bindingLight.ratio, .30);
  assert.equal(one.spells.find(spell => spell.id === 'greater').earlyMercy.ratio, .30);
  assert.equal(two.spells.find(spell => spell.id === 'greater').earlyMercy.ratio, .50);
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

test('Binding Light chooses the lowest-health other ally and uses only effective primary healing', () => {
  const game = setup({ 'binding-light': 2 });
  game.party.forEach(member => { member.hp = member.maxHp; });
  game.party[0].hp = game.party[0].maxHp - 10;
  game.party[1].hp = 100;
  game.party[2].hp = 150;
  assert.ok(game.begin('flash', 'tank').ok); advance(game, 1.5);
  assert.equal(game.party[0].hp, game.party[0].maxHp);
  assert.equal(game.party[1].hp, 103);
  assert.equal(game.party[2].hp, 150);
  assert.equal(game.events.find(event => event.spell === 'binding-light').raw, 3);
});

test('Early Mercy heals halfway, completes the remainder, and keeps its provisional heal on interrupt', () => {
  const game = setup({ 'early-mercy': 1 });
  const tank = game.party[0]; tank.hp = 1;
  const mana = game.mana;
  assert.ok(game.begin('greater', 'tank').ok);
  assert.equal(game.mana, mana - 45);
  advance(game, 1.5);
  assert.equal(tank.hp, 61);
  game.cancel();
  assert.equal(tank.hp, 61);
  assert.ok(Math.abs(game.mana - (mana - 45 + 1.5 * game.healer.manaRegen)) < 1e-8);

  const complete = setup({ 'early-mercy': 2 });
  complete.party[0].hp = 1;
  assert.ok(complete.begin('greater', 'tank').ok); advance(complete, 3);
  assert.equal(complete.party[0].hp, 201);
});

test('Focused Penance subtracts from base cooldown and Lingering Prayer only HoTs qualifying targets', () => {
  const game = setup({ 'focused-penance': 2, 'lingering-prayer': 1 });
  assert.ok(game.begin('penance', 'tank').ok); assert.equal(game.cooldowns.penance, 8); advance(game, 2);
  assert.ok(game.begin('prayer', 'tank').ok); advance(game, 3);
  for (const ally of game.party) {
    const hot = ally.hots.find(effect => effect.source === 'lingering-prayer');
    assert.equal(hot.heal, 100 * .3 / 3); assert.equal(hot.ticks, 3);
  }
  advance(game, 2); assert.equal(game.party[0].hp, 1 + 120 + 100 + 10);
  const previous = game.party[0].hots.find(effect => effect.source === 'lingering-prayer');
  assert.ok(game.begin('prayer', 'tank').ok); advance(game, 3);
  assert.equal(game.party[0].hots.filter(effect => effect.source === 'lingering-prayer').length, 1);
  assert.ok(game.party[0].hots[0].expires > previous.expires);
});

test('Fourfold Penance adds a third main bolt and smart-heals the current lowest-percent other ally', () => {
  const friendly = setup({ 'fourfold-penance': 1 });
  friendly.party.forEach(member => member.hp = member.maxHp);
  friendly.party[0].hp = 100; friendly.party[1].hp = 100; friendly.party[2].hp = 120;
  assert.ok(friendly.begin('penance', 'tank').ok); advance(friendly, 1.5);
  friendly.party[2].hp = 1; advance(friendly, .5);
  assert.equal(friendly.party[0].hp, 280);
  assert.equal(friendly.party[2].hp, 61);
  assert.equal(friendly.events.filter(event => event.type === 'heal' && event.spell === 'penance').length, 3);
  const hostile = setup({ 'fourfold-penance': 1 });
  hostile.party.forEach(member => member.hp = member.maxHp); hostile.party[4].hp = 1;
  assert.ok(hostile.begin('penance', 'boss').ok); advance(hostile, 2);
  assert.equal(hostile.boss.hp, encounter.maxHp - 45);
  assert.equal(hostile.party[4].hp, 106);
});

test('Echo of Grace heals the lowest-percent wounded ally other than the primary target', () => {
  const game = setup({ 'echo-of-grace': 1 });
  game.party.forEach(member => member.hp = member.maxHp);
  game.party[0].hp = 100; game.party[1].hp = 200; game.party[4].hp = 90;
  assert.ok(game.begin('flash', 'tank').ok); advance(game, 1.5);
  assert.equal(game.party[0].hp, 190);
  assert.equal(game.party[4].hp, 108);
  assert.ok(game.begin('greater', 'tank').ok); advance(game, 3);
  assert.equal(game.party[4].hp, 148);
});

test('Light Unspent redistributes 40% of direct Prayer overhealing once', () => {
  const game = setup({ 'light-unspent': 1, 'lingering-prayer': 1 });
  game.party.forEach(member => member.hp = member.maxHp);
  game.party[0].hp -= 300; game.party[1].hp -= 50;
  assert.ok(game.begin('prayer', 'tank').ok); advance(game, 3);
  assert.equal(game.party[0].hp, game.party[0].maxHp - 60);
  assert.equal(game.party[1].hp, game.party[1].maxHp);
  const redistributions = game.events.filter(event => event.type === 'heal' && event.spell === 'light-unspent');
  assert.equal(redistributions.length, 1);
  assert.equal(redistributions[0].raw, 140);
  advance(game, 2);
  assert.equal(game.party[0].hp, game.party[0].maxHp - 60);
  assert.equal(game.party[0].hots.some(effect => effect.source === 'lingering-prayer'), false);
  assert.equal(game.events.filter(event => event.spell === 'light-unspent').length, 1);
});

test('row 3 mechanics compose without enabling any row 4 behavior', () => {
  const game = setup({ 'fourfold-penance': 1, 'echo-of-grace': 1, 'light-unspent': 1, 'lingering-prayer': 1 });
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

test('Sanctuary reduces every incoming damage type by 20% for 12 seconds with a 60 second cooldown', () => {
  const game = setup({ sanctuary: 1 });
  assert.ok(game.begin('sanctuary', 'tank').ok);
  const tank = game.party[0]; tank.hp = tank.maxHp;
  for (const type of ['Physical', 'Magic', 'Holy']) game.damage(tank, 10, 'test', type);
  assert.equal(tank.hp, tank.maxHp - 24);
  advance(game, 12); game.damage(tank, 10, 'test', 'Holy');
  assert.equal(tank.hp, tank.maxHp - 34);
  assert.equal(game.begin('sanctuary', 'tank').ok, false);
  assert.equal(game.cooldowns.sanctuary, 60);
});

test('Divine Fervor grants healer Haste and multiplicative 20% Mana reduction for 15 seconds', () => {
  const healerGame = setup({ 'divine-fervor': 1, 'post-haste': 1 });
  const mana = healerGame.mana;
  assert.ok(healerGame.begin('divineFervor', 'tank').ok);
  assert.equal(healerGame.buffs.divineFervor.target, 'priest');
  assert.ok(healerGame.begin('greater', 'tank').ok);
  assert.equal(healerGame.cast.duration, 2.5);
  assert.equal(healerGame.cast.manaCost, 36);
  advance(healerGame, 2.5);
  assert.equal(healerGame.mana, mana - 36);
  healerGame.buffs.postHaste = 1;
  assert.ok(healerGame.begin('greater', 'tank').ok);
  assert.ok(Math.abs(healerGame.cast.manaCost - 28.8) < 1e-8);
  assert.equal(healerGame.buffs.postHaste, undefined);
  healerGame.cancel();
  advance(healerGame, 15);
  assert.equal(healerGame.haste(), 0);
  assert.equal(healerGame.begin('divineFervor', 'priest').ok, false);
});

test('row 4 talents expose only their selected active abilities and preserve rows 1–3', () => {
  const loadout = priestTalentLoadout(partyForHealer('priest'), SPELLS, {
    'binding-light': 2, 'fourfold-penance': 1, sanctuary: 1, 'divine-fervor': 1,
  });
  assert.equal(loadout.spells.find(spell => spell.id === 'flash').cost * CONFIG.baseMana, 30);
  assert.equal(loadout.spells.find(spell => spell.id === 'penance').ticks.length, 3);
  assert.deepEqual(loadout.spells.slice(-2).map(spell => [spell.id, spell.key]), [['sanctuary', '7'], ['divineFervor', '8']]);
  assert.equal(priestTalentLoadout(partyForHealer('priest'), SPELLS, {}).spells.some(spell => ['sanctuary', 'divineFervor'].includes(spell.id)), false);
});
