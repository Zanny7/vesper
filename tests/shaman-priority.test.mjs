import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { partyForHealer, CONFIG } from '../src/data.js';
import { balanceLoadout } from '../scripts/shaman-balance.mjs';
import { decideShamanPriority, expectedDamage, pendingHealing, usefulCast, unleashPackage } from '../scripts/shaman-priority.mjs';

function setup(injuries, build = {}) {
  const party = partyForHealer('shaman').map(p => ({ ...p, maxHp: 1000, damage: 0 }));
  const loadout = balanceLoadout(party, 'shaman', build);
  const g = new Combat({ name: 'Policy fixture', maxHp: 1e9, strike: { first: Infinity, every: Infinity, damage: 0 }, mechanics: [] }, () => .99, loadout.party, loadout.spells);
  g.start();
  g.party.forEach((p, i) => { p.hp -= injuries[i] || 0; });
  return g;
}

test('priority policy waits on small scratches rather than spending cooldowns into overheal', () => {
  const g = setup([10, 10, 10, 10, 10]);
  decideShamanPriority(g);
  assert.equal(g.mana, CONFIG.mana);
  assert.equal(g.cast, null);
  assert.equal(g.events.filter(e => e.type === 'cast').length, 0);
});

test('Chain useful-target counts reject nearly-full allies even before a known AoE', () => {
  const g = setup([150, 1, 1, 1, 1]);
  g.mechanics.push({ target: 'party', next: 1, damage: 200, warned: true });
  const spell = g.spells.find(s => s.id === 'chainHeal');
  assert.equal(usefulCast(g, spell, g.party[0]).usefulTargets, 1);
  g.party.forEach(p => { p.hp = p.maxHp - 300; });
  assert.equal(usefulCast(g, spell, g.party[0]).usefulTargets, 5);
});

test('priority policy chooses Chain for four large wounds and paid Surge for sustained focused wounds', () => {
  const group = setup([300, 300, 300, 300]);
  group.cooldowns = { healingStream: 100, riptide: 100, unleashLife: 100 };
  decideShamanPriority(group);
  assert.equal(group.cast?.spell.id, 'chainHeal');
  const focused = setup([200]);
  focused.cooldowns = { healingStream: 100, riptide: 100, unleashLife: 100 };
  decideShamanPriority(focused);
  assert.equal(focused.cast?.spell.id, 'recurringSurge');
});

test('efficiency mode uses Unleash outside danger; reserve mode holds it for the warning', () => {
  for (const mode of ['efficiency', 'reserve']) {
    const g = setup([400]); // 60% Health: no danger trigger.
    g.cooldowns = { healingStream: 100, riptide: 100 };
    g.mechanics.push({ id: 'spike', target: 'tank', next: 4, damage: 250, warned: false });
    decideShamanPriority(g, 'veryGood', { unleashMode: mode });
    assert.equal(!!g.buffs.unleashLife, mode === 'efficiency');
    if (mode === 'reserve') {
      g.cancel(); g.mechanics[0].warned = true;
      decideShamanPriority(g, 'veryGood', { unleashMode: mode });
      assert.equal(g.buffs.unleashLife, 1);
    }
  }
});

test('forecasts use announced random targets and only ticks due inside the horizon', () => {
  const g = setup([300]);
  g.mechanics.push({ target: 'random', next: 2, damage: 100, warned: false });
  assert.equal(expectedDamage(g, g.party[0], 3), 0);
  g.mechanics[0].warned = true; g.mechanics[0].targets = ['tank'];
  assert.ok(expectedDamage(g, g.party[0], 3) > 0);
  assert.equal(expectedDamage(g, g.party[1], 3), 0);
  assert.ok(g.begin('recurringSurge', 'tank').ok);
  while (g.cast) g.step();
  assert.equal(pendingHealing(g, g.party[0], 1), 0);
  assert.equal(pendingHealing(g, g.party[0], 2), 36);
});

test('BAT-87 snapshot is independent of exploratory tuning', () => {
  const previous = process.env.SHAMAN_TUNING;
  try {
    process.env.SHAMAN_TUNING = JSON.stringify({ healingWave: { heal: 1, ancestralEcho: .1 } });
    const spells = balanceLoadout(partyForHealer('shaman'), 'shaman', { 'ancestral-echo': 1 }, 'bat87').spells;
    assert.equal(spells.find(s => s.id === 'healingWave').heal, 125);
    assert.equal(spells.find(s => s.id === 'healingWave').ancestralEcho, 1);
  } finally {
    if (previous === undefined) delete process.env.SHAMAN_TUNING;
    else process.env.SHAMAN_TUNING = previous;
  }
});

test('smart Stream forecasting assigns a finite tick budget once across wounds', () => {
  const g = setup([50, 50, 50, 50, 50]);
  g.totem = { heal: 32, ticks: 3, interval: 2, next: 2 };
  assert.equal(g.party.reduce((sum, p) => sum + pendingHealing(g, p, 6), 0), 96);
  assert.equal(pendingHealing(g, g.party[0], 6), 32);
  assert.equal(pendingHealing(g, g.party[4], 6), 0);
  g.party[0].hp = 990;
  assert.equal(pendingHealing(g, g.party[0], 6), 0); // No stale same-time forecast.
});

test('Unleash estimates Double Current costs, faster casts and generated healing as one wound-limited package', () => {
  const g = setup([700, 700], { 'double-current': 1, earthliving: 1 });
  const wave = usefulCast(g, g.spells.find(s => s.id === 'healingWave'), g.party[0]);
  const plain = unleashPackage(g, wave, g.party[0], false);
  const boosted = unleashPackage(g, wave, g.party[0], true);
  assert.equal(plain.cost, 64);
  assert.equal(boosted.cost, 88);
  assert.equal(plain.duration, 5);
  assert.equal(boosted.duration, 4);
  assert.ok(plain.useful > 250); // Includes the two generated Surge grants.
  assert.ok(boosted.useful > plain.useful);
  g.party.forEach(p => { p.hp = p.maxHp - 10; });
  const clipped = unleashPackage(g, wave, g.party[0], true);
  assert.ok(clipped.useful <= 30); // Instant + two follows cannot reuse wounds.
});
