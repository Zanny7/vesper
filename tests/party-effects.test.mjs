import test from 'node:test';
import assert from 'node:assert/strict';
import { partyEffects, effectMarkup } from '../src/party-effects.js';
import { Combat } from '../src/combat.js';
import { DRUID_SPELLS, partyForHealer } from '../src/data.js';
const sources = effects => effects.map(e => e.source);
test('display follows real HoT application, refresh, consumption and expiry', () => {
  const g = new Combat({ name: 'Test', maxHp: 99999, strike: { first: Infinity }, mechanics: [] }, () => 0, partyForHealer('druid'), DRUID_SPELLS);
  g.start(); g.begin('wildGrowth', 'tank'); g.begin('regrowth', 'tank');
  for (let i = 0; i < 90; i++) g.step();
  g.begin('rejuvenation', 'tank');
  const t = g.party[0];
  assert.deepEqual(sources(partyEffects(t, g.time).helpful), ['rejuvenation', 'regrowth', 'wildGrowth']);
  assert.equal(partyEffects(t, g.time).helpful.length, g.activeHots(t).length);
  g.begin('swiftmend', 'tank');
  assert.deepEqual(sources(partyEffects(t, g.time).helpful), ['rejuvenation', 'regrowth']);
  assert.deepEqual(sources(partyEffects(g.party[1], g.time).helpful), ['wildGrowth']);
  for (let i = 0; i < 120; i++) g.step();
  g.begin('rejuvenation', 'tank');
  assert.match(effectMarkup(partyEffects(t, g.time).helpful, g.time), /Rejuvenation: 15s remaining/);
  for (let i = 0; i < 1080; i++) g.step();
  assert.deepEqual(partyEffects(t, g.time).helpful, []);
});
test('debuff selection is deterministic: dispellable, priority, damage rate, then source', () => {
  const member = { hp: 1, dots: [
    { source: 'light', name: 'Light wound', next: 2, ticks: 4, interval: 2, damage: 5 },
    { source: 'heavy', name: 'Heavy wound', next: 3, ticks: 4, interval: 3, damage: 60 },
    { source: 'urgent', name: 'Urgent wound', next: 2, ticks: 4, interval: 2, damage: 1, priority: 5 },
  ], debuffs: [{ source: 'curse', name: 'Curse', dispellable: true }] };
  assert.deepEqual(sources(partyEffects(member, 0).negative), ['curse', 'urgent']);
  member.debuffs = []; assert.deepEqual(sources(partyEffects(member, 0).negative), ['urgent', 'heavy']);
  member.dots.reverse(); assert.deepEqual(sources(partyEffects(member, 0).negative), ['urgent', 'heavy']);
  assert.deepEqual(partyEffects(member, 20).negative, []);
});
test('future helpful effects support indefinite durations and safe descriptions', () => {
  const member = { hp: 1, helpfulEffects: [{ id: 'shield', name: 'Shield <strong>', icon: 'shield' }] };
  const markup = effectMarkup(partyEffects(member, 10).helpful, 10);
  assert.match(markup, /Shield &lt;strong&gt;/); assert.ok(!markup.includes('<b>'));
  member.hp = 0; assert.deepEqual(partyEffects(member, 10), { helpful: [], negative: [] });
});
test('temporary defense modifiers appear as helpful or negative status effects with numeric tooltips', () => {
  const g = new Combat(); const tank = g.party[0];
  g.applyDefenseModifier(tank, { source: 'sunder', name: 'Sundered Armor', stat: 'armor', modifier: -30, duration: 8 });
  g.applyDefenseModifier(tank, { source: 'ward', name: 'Ward', stat: 'resistance', modifier: 20, duration: 12 });
  const effects = partyEffects(tank, g.time);
  assert.deepEqual(sources(effects.negative), ['sunder']);
  assert.deepEqual(sources(effects.helpful), ['ward']);
  assert.match(effectMarkup(effects.negative, g.time), /Sundered Armor \(-30 Armor\): 8s remaining/);
  assert.match(effectMarkup(effects.helpful, g.time), /Ward \(\+20 Resistance\): 12s remaining/);
});
