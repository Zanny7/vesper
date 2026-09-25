import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { CONFIG, DRUID_SPELLS, partyForHealer } from '../src/data.js';
import { druidTalentLoadout } from '../src/druid-talents.js';
import { partyEffects, effectMarkup } from '../src/party-effects.js';

const encounter = { name: 'Training', maxHp: 100000, strike: { first: Infinity, every: 3, damage: 0 }, mechanics: [] };
const advance = (game, seconds) => { for (let i = 0; i < Math.round(seconds / CONFIG.step); i++) game.step(); };
const setup = (allocations = {}, party = partyForHealer('druid')) => {
  const loadout = druidTalentLoadout(party, DRUID_SPELLS, allocations);
  const game = new Combat(encounter, () => .99, loadout.party, loadout.spells);
  game.start(); game.party.forEach(member => { member.hp = 1; member.nextAttack = Infinity; });
  return game;
};
const cast = (game, id, target = 'tank') => {
  assert.equal(game.begin(id, target).ok, true);
  if (game.cast) advance(game, game.cast.duration);
};
const hot = (game, id, target = 'tank') => game.party.find(member => member.id === target).hots.find(effect => effect.source === id);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≠ ${expected}`);

test('Druid rank budget, baseline Swiftmend preservation, and gear-inclusive Mana regeneration', () => {
  const party = partyForHealer('druid').map(member => member.label === 'HEALER' ? { ...member, manaRegen: 3 } : member);
  for (const [ranks, regen] of [[0, 3], [1, 3.6], [2, 4.2]]) {
    const loadout = druidTalentLoadout(party, DRUID_SPELLS, { 'natural-regeneration': ranks });
    near(loadout.party.find(member => member.label === 'HEALER').manaRegen, regen);
  }
  const game = setup();
  cast(game, 'rejuvenation'); cast(game, 'swiftmend');
  assert.ok(hot(game, 'rejuvenation'));
  assert.equal(game.spells.find(spell => spell.id === 'swiftmend').preserveHot, true);
  assert.equal(game.spells.find(spell => spell.id === 'rejuvenation').hot.heal, 30);
  assert.equal(druidTalentLoadout(party, DRUID_SPELLS, { 'empowered-rejuvenation': 2 }).spells.find(spell => spell.id === 'rejuvenation').hot.heal, 36);
});

test('Nourish is a finite four-tick pool that adds unspent healing on recast', () => {
  const game = setup();
  cast(game, 'rejuvenation'); cast(game, 'nourish');
  near(hot(game, 'nourish').heal, 27.5);
  assert.equal(hot(game, 'nourish').ticks, 4);
  assert.match(effectMarkup(partyEffects(game.party[0], game.time).helpful, game.time), /Nourish \(110 healing in 4 remaining ticks\): 4s remaining/);
  advance(game, 1);
  const remaining = hot(game, 'nourish').heal * hot(game, 'nourish').ticks;
  near(remaining, 82.5);
  cast(game, 'nourish');
  near(hot(game, 'nourish').heal * hot(game, 'nourish').ticks, remaining - 2 * 27.5 + 110);
  near(hot(game, 'nourish').expires, game.time + 4);
  assert.match(effectMarkup(partyEffects(game.party[0], game.time).helpful, game.time), /Nourish \(137.5 healing in 4 remaining ticks\): 4s remaining/);
  advance(game, 4);
  assert.equal(hot(game, 'nourish'), undefined);
  near(game.events.filter(event => event.type === 'heal' && event.spell === 'nourish').reduce((sum, event) => sum + event.raw, 0), 220);
});

test('Nourish bonus counts three core types only, with 20/40 extra healing per type by rank', () => {
  for (const [rank, total] of [[0, 170], [1, 230], [2, 290]]) {
    const game = setup({ 'abundant-nourishment': rank, 'cenarion-ward': 1 });
    for (const id of ['rejuvenation', 'regrowth', 'wildGrowth']) cast(game, id);
    cast(game, 'cenarionWard');
    cast(game, 'nourish');
    near(hot(game, 'nourish').heal * hot(game, 'nourish').ticks, total);
    assert.equal(game.spells.find(spell => spell.id === 'nourish').cast, 2);
  }
});

test('Haste changes finite Nourish and Ward tick counts without minting healing', () => {
  const party = partyForHealer('druid').map(member => member.label === 'HEALER' ? { ...member, haste: 20, spellPower: 20 } : member);
  const game = setup({ 'cenarion-ward': 1 }, party);
  cast(game, 'nourish');
  near(hot(game, 'nourish').heal * hot(game, 'nourish').ticks, 100);
  assert.equal(hot(game, 'nourish').ticks, 4);
  cast(game, 'cenarionWard');
  near(hot(game, 'cenarionWard').heal * hot(game, 'cenarionWard').ticks, 200);
  assert.equal(hot(game, 'cenarionWard').ticks, 7);
});

test('Nourishing Touch adds uncapped normal ticks to each eligible HoT, including triggered Ward, but excludes Nourish', () => {
  const game = setup({ 'nourishing-touch': 2, 'cenarion-ward': 1 });
  cast(game, 'rejuvenation'); cast(game, 'regrowth'); cast(game, 'wildGrowth'); cast(game, 'cenarionWard');
  for (const id of ['rejuvenation', 'regrowth', 'wildGrowth', 'cenarionWard']) assert.ok(hot(game, id));
  const before = Object.fromEntries(['rejuvenation', 'regrowth', 'wildGrowth', 'cenarionWard'].map(id => [id, { ticks: hot(game, id).ticks, expires: hot(game, id).expires }]));
  cast(game, 'nourish');
  for (const id of Object.keys(before)) {
    const effect = hot(game, id);
    assert.ok(effect.ticks >= before[id].ticks + 2 - 2, id); // Earlier ticks can resolve during the cast.
    near(effect.expires, before[id].expires + 2 * effect.baseInterval);
  }
  near(hot(game, 'nourish').expires, game.time + 4);
  const firstExpiry = hot(game, 'rejuvenation').expires;
  cast(game, 'nourish');
  near(hot(game, 'rejuvenation').expires, firstExpiry + 6);
});

test('repeated Nourishing Touch extensions add normal healing without an extension cap', () => {
  const game = setup({ 'nourishing-touch': 1 });
  cast(game, 'rejuvenation');
  for (let i = 0; i < 4; i++) {
    cast(game, 'nourish');
    near(hot(game, 'rejuvenation').expires, 15 + (i + 1) * 3);
    near(hot(game, 'nourish').expires, game.time + 4);
  }
  advance(game, 19);
  near(game.events.filter(event => event.type === 'heal' && event.spell === 'rejuvenation').reduce((sum, event) => sum + event.raw, 0), 270);
});

test('Passing Bloom transfers a nine-second Regrowth to the lowest-percent eligible ally, or drops it', () => {
  const game = setup({ 'passing-bloom': 1 });
  game.party.forEach(member => member.hp = member.maxHp);
  game.party[0].hp = 100; game.party[1].hp = 200; game.party[2].hp = 100;
  cast(game, 'regrowth'); advance(game, 3);
  const old = hot(game, 'regrowth');
  cast(game, 'regrowth');
  assert.equal(hot(game, 'regrowth', game.party[2].id), old);
  near(old.expires, game.time + 9);
  assert.equal(old.ticks, 3);
  assert.equal(game.party[0].hots.filter(effect => effect.source === 'regrowth').length, 1);
  const solo = setup({ 'passing-bloom': 1 });
  solo.party.slice(1).forEach(member => { member.hp = member.maxHp; });
  cast(solo, 'regrowth'); const replaced = hot(solo, 'regrowth'); cast(solo, 'regrowth');
  assert.ok(!solo.party.flatMap(member => member.hots).includes(replaced));
});

test('Ward triggers at the inclusive 50% edge, shows distinct timed states, expires, and recharges sequentially', () => {
  const game = setup({ 'cenarion-ward': 2 });
  const target = game.party[0]; target.hp = target.maxHp;
  cast(game, 'cenarionWard');
  assert.equal(game.availableCharges('cenarionWard'), 1);
  assert.equal(partyEffects(target, game.time).helpful.find(effect => effect.source === 'cenarionWardArmed').name, 'Cenarion Ward Armed');
  game.damage(target, target.maxHp / 2 - 1, 'test');
  assert.ok(target.ward);
  game.damage(target, 1, 'test');
  assert.equal(target.ward, undefined);
  assert.equal(hot(game, 'cenarionWard').ticks, 6);
  assert.match(effectMarkup(partyEffects(target, game.time).helpful, game.time), /Cenarion Ward Bloom: 6s remaining/);
  cast(game, 'cenarionWard', game.party[1].id);
  assert.equal(game.availableCharges('cenarionWard'), 0);
  assert.equal(game.begin('cenarionWard', 'tank').ok, false);
  advance(game, 20);
  assert.equal(game.party[1].ward, undefined);
  assert.ok(!partyEffects(game.party[1], game.time).helpful.some(effect => effect.source === 'cenarionWardArmed'));
  advance(game, 10);
  assert.equal(game.availableCharges('cenarionWard'), 1);
  advance(game, 30);
  assert.equal(game.availableCharges('cenarionWard'), 2);
  const immediate = setup({ 'cenarion-ward': 1 });
  immediate.party[0].hp = immediate.party[0].maxHp / 2;
  cast(immediate, 'cenarionWard');
  assert.ok(hot(immediate, 'cenarionWard'));
  const below = setup({ 'cenarion-ward': 1 });
  below.party[0].hp = below.party[0].maxHp / 2 - 1;
  cast(below, 'cenarionWard');
  assert.ok(hot(below, 'cenarionWard'));
  const geared = setup({ 'cenarion-ward': 1 }, partyForHealer('druid').map(member => member.label === 'HEALER' ? { ...member, spellPower: 30 } : member));
  cast(geared, 'cenarionWard');
  near(hot(geared, 'cenarionWard').heal * hot(geared, 'cenarionWard').ticks, 210);
});

test('Blooming Swiftmend chooses exactly two lowest-health other living allies for 30% raw healing', () => {
  const game = setup({ 'blooming-swiftmend': 1 });
  game.party.forEach((member, index) => { member.hp = member.maxHp * [.5, .3, .8, .2, .9][index]; });
  cast(game, 'rejuvenation'); cast(game, 'swiftmend');
  const blooms = game.events.filter(event => event.type === 'heal' && event.spell === 'blooming-swiftmend');
  assert.deepEqual(blooms.map(event => event.target), [game.party[3].id, game.party[1].id]);
  assert.ok(blooms.every(event => event.raw === 39));
  assert.ok(hot(game, 'rejuvenation'));
});

test('Overgrowth lowers cost, bypasses cooldown and conserves transferred remaining healing', () => {
  const game = setup({ overgrowth: 1 });
  game.party.forEach(member => { member.hp = member.maxHp * .5; });
  game.party[0].hp = game.party[0].maxHp * .9;
  cast(game, 'wildGrowth');
  near(game.mana, CONFIG.mana - 56);
  const before = game.party.reduce((sum, member) => sum + hot(game, 'wildGrowth', member.id).heal * hot(game, 'wildGrowth', member.id).ticks, 0);
  advance(game, 1);
  const after = game.party.reduce((sum, member) => sum + hot(game, 'wildGrowth', member.id).heal * hot(game, 'wildGrowth', member.id).ticks, 0);
  near(after, before - game.events.filter(event => event.type === 'heal' && event.spell === 'wildGrowth').reduce((sum, event) => sum + event.raw, 0));
  assert.ok(hot(game, 'wildGrowth', game.party[1].id).heal > 12);
  const conservation = setup({ overgrowth: 1 });
  conservation.party.forEach(member => { member.hp = member.maxHp * .5; });
  conservation.party[0].hp = conservation.party[0].maxHp * .9;
  cast(conservation, 'wildGrowth'); advance(conservation, 8);
  near(conservation.events.filter(event => event.type === 'heal' && event.spell === 'wildGrowth').reduce((sum, event) => sum + event.raw, 0), 480);
  assert.ok(conservation.party.every(member => !hot(conservation, 'wildGrowth', member.id)));
  assert.equal(game.begin('wildGrowth', 'tank').ok, true);
  assert.equal(game.cast.duration, 1);
  advance(game, 1);
  assert.equal(game.cooldowns.wildGrowth, 10);
});

test('Genesis refreshes core HoTs and adds an eight-second acceleration without duplicating Nourish or Ward pools', () => {
  const game = setup({ genesis: 1, 'cenarion-ward': 1 });
  cast(game, 'rejuvenation'); cast(game, 'wildGrowth'); cast(game, 'cenarionWard'); cast(game, 'nourish');
  const nourish = hot(game, 'nourish'), ward = hot(game, 'cenarionWard');
  const pool = nourish.heal * nourish.ticks, wardPool = ward.heal * ward.ticks;
  cast(game, 'genesis');
  near(hot(game, 'rejuvenation').expires, game.time + 15);
  near(hot(game, 'wildGrowth').expires, game.time + 8);
  near(hot(game, 'rejuvenation').genesisUntil, game.time + 8);
  near(nourish.heal * nourish.ticks, pool);
  near(ward.heal * ward.ticks, wardPool);
  assert.equal(game.cooldowns.genesis, game.time + 60);
});

test('Twin and Living Rejuvenation retain two independent moving instances', () => {
  const game = setup({ 'twin-rejuvenation': 1, 'living-rejuvenation': 1 });
  game.party.forEach(member => member.hp = member.maxHp);
  game.party[0].hp = 100; game.party[1].hp = 100;
  cast(game, 'rejuvenation'); cast(game, 'rejuvenation');
  assert.equal(game.party[0].hots.filter(effect => effect.source === 'rejuvenation').length, 2);
  assert.ok(hot(game, 'rejuvenation').interval < 3);
  game.party[0].hp = game.party[0].maxHp;
  advance(game, 2.5);
  assert.ok(game.party[1].hots.some(effect => effect.source === 'rejuvenation'));
});

test('Tranquility keeps five party ticks and uses a 60-second cooldown', () => {
  const game = setup({ tranquility: 1 });
  cast(game, 'tranquility');
  assert.equal(game.events.filter(event => event.type === 'heal' && event.spell === 'tranquility').length, 25);
  assert.equal(game.cooldowns.tranquility, 60);
});
