import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { CONFIG, DRUID_SPELLS, partyForHealer } from '../src/data.js';
import { druidTalentLoadout } from '../src/druid-talents.js';

const encounter = { name: 'Training', maxHp: 100000, strike: { first: Infinity, every: 3, damage: 0 }, mechanics: [] };
const advance = (game, seconds) => { for (let step = 0; step < Math.round(seconds / CONFIG.step); step++) game.step(); };
const setup = (allocations = {}, party = partyForHealer('druid')) => {
  const loadout = druidTalentLoadout(party, DRUID_SPELLS, allocations);
  const game = new Combat(encounter, () => 0, loadout.party, loadout.spells);
  game.start(); game.party.forEach(member => { member.hp = 1; member.nextAttack = Infinity; });
  return game;
};
const cast = (game, id, target = 'tank') => {
  assert.equal(game.begin(id, target).ok, true);
  if (game.cast) advance(game, game.cast.duration);
};

test('Druid row 1 preserves Swiftmend HoTs and derives Rejuvenation healing and Nourish cast time by rank', () => {
  const one = druidTalentLoadout(partyForHealer('druid'), DRUID_SPELLS, {
    'preserved-growth': 1, 'empowered-rejuvenation': 1, 'nourishing-touch': 1,
  });
  const two = druidTalentLoadout(partyForHealer('druid'), DRUID_SPELLS, {
    'empowered-rejuvenation': 2, 'nourishing-touch': 2,
  });
  assert.ok(Math.abs(one.spells.find(spell => spell.id === 'rejuvenation').hot.heal - 33) < 1e-8);
  assert.equal(two.spells.find(spell => spell.id === 'rejuvenation').hot.heal, 36);
  assert.equal(one.spells.find(spell => spell.id === 'nourish').cast, 1.8);
  assert.equal(two.spells.find(spell => spell.id === 'nourish').cast, 1.6);
  const game = setup({ 'preserved-growth': 1 });
  cast(game, 'rejuvenation'); cast(game, 'swiftmend');
  assert.equal(game.party[0].hots.filter(hot => hot.source === 'rejuvenation').length, 1);
});

test('Passing Bloom moves the old Regrowth state to the lowest-percent other ally without duplication', () => {
  const game = setup({ 'passing-bloom': 1 });
  game.party.forEach(member => member.hp = member.maxHp);
  game.party[0].hp = 100; game.party[1].hp = 200; game.party[2].hp = 100;
  cast(game, 'regrowth', 'tank'); advance(game, 4);
  const old = game.party[0].hots.find(hot => hot.source === 'regrowth');
  const oldApplied = old.applied, oldTicks = old.ticks;
  cast(game, 'regrowth', 'tank');
  const moved = game.party[2].hots.find(hot => hot.source === 'regrowth');
  assert.equal(moved.applied, oldApplied);
  assert.ok(moved.ticks <= oldTicks);
  assert.equal(game.party[0].hots.filter(hot => hot.source === 'regrowth').length, 1);
  assert.equal(game.party.flatMap(member => member.hots).filter(hot => hot.source === 'regrowth').length, 2);
});

test('Cenarion Ward triggers on the next damage and increases healing received for exactly 10 seconds', () => {
  const game = setup({ 'cenarion-ward': 1 });
  const target = game.party[0]; target.hp = target.maxHp;
  cast(game, 'cenarionWard');
  assert.equal(game.mana, CONFIG.mana - 45); assert.equal(game.cooldowns.cenarionWard, 30);
  game.damage(target, 100, 'test');
  assert.equal(target.ward, undefined); assert.equal(target.healingReceived.amount, .2);
  game.heal(target, 100, 'test'); assert.equal(target.hp, target.maxHp);
  target.hp -= 200; advance(game, 10); game.heal(target, 100, 'test');
  assert.equal(target.hp, target.maxHp - 100); assert.equal(target.healingReceived, undefined);
  const expired = setup({ 'cenarion-ward': 1 }); cast(expired, 'cenarionWard'); advance(expired, 20);
  assert.equal(expired.party[0].ward, undefined);
});

test('Abundant Nourishment raises only the three-type capped per-HoT bonus', () => {
  for (const [ranks, bonus] of [[1, 25], [2, 30]]) {
    const game = setup({ 'abundant-nourishment': ranks });
    for (const id of ['rejuvenation', 'regrowth', 'wildGrowth']) cast(game, id);
    cast(game, 'nourish');
    assert.equal(game.events.filter(event => event.type === 'heal' && event.spell === 'nourish').at(-1).raw, 80 + bonus * 3);
  }
});

test('Blooming Swiftmend uses calculated pre-overheal healing and composes with Preserved Growth', () => {
  const game = setup({ 'preserved-growth': 1, 'blooming-swiftmend': 1 });
  game.party.forEach(member => member.hp = member.maxHp - 10);
  cast(game, 'rejuvenation'); cast(game, 'swiftmend');
  assert.equal(game.party[0].hots.filter(hot => hot.source === 'rejuvenation').length, 1);
  assert.equal(game.events.filter(event => event.spell === 'blooming-swiftmend').length, 4);
  assert.ok(game.events.filter(event => event.spell === 'blooming-swiftmend').every(event => event.raw === 26));
});

test('Overgrowth casts through cooldown in one second and rolls pending Wild Growth healing into a fresh pool', () => {
  const game = setup({ overgrowth: 1 });
  cast(game, 'wildGrowth'); advance(game, 2);
  assert.equal(game.cooldowns.wildGrowth, 10);
  assert.equal(game.begin('wildGrowth', 'tank').ok, true); assert.equal(game.cast.duration, 1); advance(game, 1);
  const hot = game.party[0].hots.find(effect => effect.source === 'wildGrowth');
  assert.equal(hot.ticks, 8); assert.equal(hot.heal, 16.25);
  assert.equal(game.cooldowns.wildGrowth, 10);
});

test('Living Rejuvenation accelerates below half Health and jumps with remaining state instead of duplicating', () => {
  const game = setup({ 'living-rejuvenation': 1 });
  game.party.forEach(member => member.hp = member.maxHp);
  game.party[0].hp = 100; game.party[1].hp = 50;
  cast(game, 'rejuvenation');
  const hot = game.party[0].hots[0]; assert.equal(hot.next, 2.5);
  advance(game, 2.5); assert.equal(game.party[0].hp, 130); assert.equal(hot.next, 5);
  game.party[0].hp = game.party[0].maxHp;
  advance(game, 2.5);
  assert.equal(game.party[0].hots.length, 0);
  assert.equal(game.party[1].hots[0], hot);
  assert.equal(game.party[1].hp, 80);
});

test('Genesis extends active Druid HoTs and adds normal ticks without changing pending healing', () => {
  const game = setup({ genesis: 1, overgrowth: 1 });
  cast(game, 'wildGrowth'); advance(game, 2); cast(game, 'wildGrowth');
  const before = game.party[0].hots.find(hot => hot.source === 'wildGrowth');
  const pending = before.heal * before.ticks, expires = before.expires, ticks = before.ticks;
  cast(game, 'genesis');
  assert.equal(before.expires, expires + 10);
  assert.equal(before.ticks, ticks + 10);
  assert.equal(before.heal * (before.ticks - 10), pending);
  assert.equal(game.cooldowns.genesis, game.time + 60);
});

test('Twin Rejuvenation keeps two independent instances, replaces the shortest, and still counts as one Nourish type', () => {
  const game = setup({ 'twin-rejuvenation': 1 });
  cast(game, 'rejuvenation'); const first = game.party[0].hots[0]; advance(game, 1);
  cast(game, 'rejuvenation'); const second = game.party[0].hots.find(hot => hot !== first); advance(game, 1);
  cast(game, 'rejuvenation');
  assert.equal(game.party[0].hots.filter(hot => hot.source === 'rejuvenation').length, 2);
  assert.ok(!game.party[0].hots.includes(first)); assert.ok(game.party[0].hots.includes(second));
  cast(game, 'nourish');
  assert.equal(game.events.filter(event => event.type === 'heal' && event.spell === 'nourish').at(-1).raw, 100);
});

test('Twin and Living Rejuvenation jump independently without exceeding the two-instance destination cap', () => {
  const game = setup({ 'twin-rejuvenation': 1, 'living-rejuvenation': 1 });
  game.party.forEach(member => member.hp = member.maxHp);
  game.party[0].hp = 100; game.party[1].hp = 100;
  cast(game, 'rejuvenation', 'tank'); cast(game, 'rejuvenation', 'tank');
  cast(game, 'rejuvenation', 'rogue');
  game.party[0].hp = game.party[0].maxHp;
  advance(game, 2.5);
  assert.equal(game.party[0].hots.filter(hot => hot.source === 'rejuvenation').length, 1);
  assert.equal(game.party[1].hots.filter(hot => hot.source === 'rejuvenation').length, 2);
  advance(game, 2.5);
  assert.equal(game.party[1].hots.filter(hot => hot.source === 'rejuvenation').length, 2);
});

test('Tranquility heals every living member five times and applies Spell Power once per member total', () => {
  const party = partyForHealer('druid').map(member => member.label === 'HEALER' ? { ...member, spellPower: 50 } : member);
  const game = setup({ tranquility: 1 }, party);
  cast(game, 'tranquility');
  for (const member of game.party) assert.equal(member.hp, 201);
  assert.equal(game.events.filter(event => event.type === 'heal' && event.spell === 'tranquility').length, 25);
  assert.ok(Math.abs(game.mana - (CONFIG.mana - 100 + game.healer.manaRegen * 5)) < 1e-8);
  assert.equal(game.cooldowns.tranquility, 90);
});
