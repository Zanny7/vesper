import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { DRUID_SPELLS, partyForHealer, CONFIG } from '../src/data.js';
const encounter = { name: 'Training', maxHp: 100000, strike: { first: Infinity, every: 3, damage: 0 }, mechanics: [] };
function setup() { const g = new Combat(encounter, () => 0, partyForHealer('druid'), DRUID_SPELLS); g.start(); g.party.forEach(p => p.hp = 1); return g; }
function advance(g, seconds) { for (let i = 0; i < Math.round(seconds * 60); i++) g.step(); }
function cast(g, id, target = 'tank') { assert.equal(g.begin(id, target).ok, true); if (g.cast) advance(g, g.cast.duration); }

test('Druid costs, durations, exact HoT totals and final ticks', () => {
  for (const [id, cost, castTime, duration, interval, direct, tick, count] of [
    ['rejuvenation', 30, 0, 15, 3, 0, 25, 5], ['regrowth', 40, 1.5, 18, 3, 50, 20, 6], ['wildGrowth', 70, 0, 8, 1, 0, 10, 8],
  ]) {
    const g = setup(), t = g.party[0];
    assert.equal(g.begin(id, 'tank').ok, true);
    assert.equal(g.mana, CONFIG.mana - (castTime ? 0 : cost));
    assert.equal(g.cast?.duration || 0, castTime);
    if (castTime) { assert.equal(t.hp, 1); advance(g, castTime); }
    assert.equal(t.hp, 1 + direct);
    advance(g, interval - 1 / 60); assert.equal(t.hp, 1 + direct);
    advance(g, 1 / 60); assert.equal(t.hp, 1 + direct + tick);
    advance(g, duration - interval);
    assert.equal(t.hp, 1 + direct + tick * count); assert.equal(t.hots.length, 0);
    assert.equal(g.events.filter(e => e.type === 'heal' && e.target === 'tank').length, count + (direct ? 1 : 0));
    if (id === 'wildGrowth') for (const ally of g.party) assert.equal(ally.hp, 81);
  }
});
test('refresh replaces each HoT and restarts duration and tick timer', () => {
  for (const id of ['rejuvenation', 'regrowth', 'wildGrowth']) {
    const g = setup(), t = g.party[0], spell = DRUID_SPELLS.find(s => s.id === id);
    cast(g, id); advance(g, 0.5); g.cooldowns[id] = 0; cast(g, id);
    assert.equal(t.hots.length, 1); assert.equal(t.hots[0].expires, g.time + spell.hot.duration);
    const hp = t.hp; advance(g, spell.hot.interval - 1 / 60); assert.equal(t.hp, hp);
    advance(g, 1 / 60); assert.equal(t.hp, hp + spell.hot.heal);
  }
});
test('Swiftmend rejects unprepared targets without spending mana or cooldown', () => {
  const g = setup(); assert.equal(g.begin('swiftmend', 'tank').ok, false);
  assert.equal(g.mana, CONFIG.mana); assert.equal(g.cooldowns.swiftmend, undefined); assert.equal(g.stats.casts, 0);
  cast(g, 'rejuvenation'); const mana = g.mana; cast(g, 'swiftmend');
  assert.equal(g.party[0].hp, 161); assert.equal(g.party[0].hots.length, 0);
  assert.equal(g.mana, mana - 35); assert.equal(g.cooldowns.swiftmend, g.time + 15);
  cast(g, 'rejuvenation'); assert.match(g.begin('swiftmend', 'tank').reason, /Swiftmend is on cooldown/);
});
test('Swiftmend consumes shortest remaining duration, preserving other targets', () => {
  const g = setup(), t = g.party[0];
  cast(g, 'rejuvenation'); advance(g, 10); cast(g, 'regrowth'); cast(g, 'wildGrowth');
  assert.equal(t.hots.length, 3); cast(g, 'swiftmend');
  assert.deepEqual(t.hots.map(h => h.source), ['regrowth', 'wildGrowth']);
  const other = setup(); cast(other, 'rejuvenation'); cast(other, 'regrowth'); cast(other, 'wildGrowth'); cast(other, 'swiftmend');
  assert.deepEqual(other.party[0].hots.map(h => h.source), ['rejuvenation', 'regrowth']);
  assert.ok(other.party.slice(1).every(p => p.hots.some(h => h.source === 'wildGrowth')));
});
test('Nourish heals 80/100/120/140 based on HoTs at completion', () => {
  for (let count = 0; count <= 3; count++) {
    const g = setup(); for (const id of ['rejuvenation', 'regrowth', 'wildGrowth'].slice(0, count)) cast(g, id);
    const mana = g.mana; assert.equal(g.begin('nourish', 'tank').ok, true); assert.equal(g.mana, mana);
    assert.equal(g.cast.duration, 2); advance(g, 2);
    assert.ok(Math.abs(g.mana - (Math.min(g.maxMana, mana + 2 * g.healer.manaRegen) - 30)) < 1e-8);
    assert.equal(g.events.filter(e => e.type === 'heal' && e.spell === 'nourish').at(-1).raw, 80 + count * 20);
  }
  const g = setup(); cast(g, 'rejuvenation'); advance(g, 14); cast(g, 'nourish');
  assert.equal(g.events.filter(e => e.type === 'heal' && e.spell === 'nourish').at(-1).raw, 80);
});
test('HoTs pause, clear on death/reset, and do not revive dead allies', () => {
  const g = setup(); cast(g, 'wildGrowth'); const next = g.party[0].hots[0].next;
  g.pause(); advance(g, 10); assert.equal(g.time, 0); assert.equal(g.party[0].hots[0].next, next); g.pause();
  g.damage(g.party[1], 1000, 'test'); assert.equal(g.party[1].hots.length, 0);
  advance(g, 1); assert.equal(g.party[1].hp, 0);
  g.reset(); assert.ok(g.party.every(p => p.hots.length === 0));
});
test('cancelled Regrowth applies no healing; Wild Growth skips dead allies and respects cooldown', () => {
  const g = setup(), mana = g.mana; g.begin('regrowth', 'tank'); advance(g, 1); g.cancel(); advance(g, 1);
  assert.equal(g.party[0].hp, 1); assert.equal(g.party[0].hots.length, 0);
  assert.equal(g.mana, mana);
  g.damage(g.party[1], 1000, 'test'); cast(g, 'wildGrowth');
  assert.equal(g.party[1].hots.length, 0);
  assert.match(g.begin('wildGrowth', 'tank').reason, /Wild Growth is on cooldown/);
  advance(g, 10); assert.equal(g.begin('wildGrowth', 'tank').ok, true);
});
