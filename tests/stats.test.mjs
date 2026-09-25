import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { CONFIG, HEALERS, SPELLS, DRUID_SPELLS, CHAPTER_ENCOUNTERS, ENCOUNTER, DAMAGE_TYPES, partyForHealer } from '../src/data.js';
import { healingParts, mitigatedDamage } from '../src/stats.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
test('baseline healers have requested resources and neutral new stats', () => {
  for (const id of ['priest', 'druid']) {
    const g = new Combat(undefined, () => 0, partyForHealer(id), HEALERS[id].combatSpells);
    assert.equal(g.healer.maxHp, 400); assert.equal(g.maxMana, 600); assert.equal(g.mana, 600);
    g.mana = 300; g.step(5); assert.equal(g.mana, 300); g.start(); g.step(1); assert.equal(g.mana, 302);
    assert.ok(g.party.every(p => p.armor === 0 && p.resistance === 0)); assert.equal(g.spellPower, 0);
  }
});
test('Spell Power adds once to direct, channel, mixed and per-target HoT totals', () => {
  const byId = id => [...SPELLS, ...DRUID_SPELLS].find(s => s.id === id);
  close(healingParts(byId('flash'), 10).direct, 100);
  close(healingParts(byId('prayer'), 10).direct, 110);
  close(healingParts(byId('penance'), 10).direct, 130);
  close(healingParts(byId('rejuvenation'), 10).hotTick, 32);
  close(healingParts(byId('wildGrowth'), 10).hotTick, 13.25);
  const growth = healingParts(byId('regrowth'), 10);
  close(growth.direct, 60 * 190 / 180); close(growth.hotTick, 20 * 190 / 180); close(growth.direct + growth.hotTick * 6, 190);
});
test('combat delivers scaled healing for every kit spell without per-tick bonus inflation', () => {
  for (const id of ['priest', 'druid']) for (const spell of HEALERS[id].combatSpells.filter(spell => spell.heal || spell.hot)) {
    const party = partyForHealer(id).map(p => ({ ...p, maxHp: 10000, damage: 0, ...(p.label === 'HEALER' ? { spellPower: 10 } : {}) }));
    const g = new Combat({ name: 'Test', maxHp: 9999, strike: { first: Infinity }, mechanics: [] }, () => 0, party, HEALERS[id].combatSpells);
    g.start(); g.party.forEach(p => p.hp = 1);
    if (spell.consumesHot) g.applyHot(g.party[0], DRUID_SPELLS[0]);
    assert.ok(g.begin(spell.id, 'tank').ok);
    for (let i = 0; i < Math.round((spell.cast + (spell.hot?.duration || 0)) / CONFIG.step) + 1; i++) g.step();
    const total = g.events.filter(e => e.type === 'heal' && e.spell === spell.id && e.target === 'tank').reduce((sum, e) => sum + e.raw, 0);
    const base = spell.channel ? spell.ticks.reduce((n, t) => n + t.heal, 0) : spell.heal + (spell.hot ? spell.hot.heal * spell.hot.duration / spell.hot.interval : 0);
    close(total, base + 10);
    if (spell.party) for (const p of g.party) close(p.hp, 1 + base + 10);
  }
});
test('scalable mitigation applies positive and negative Armor and Resistance only to matching types', () => {
  for (const [defense, expected] of [[100, 50], [50, 200 / 3], [25, 80], [0, 100], [-25, 120], [-50, 400 / 3], [-100, 150]]) {
    close(mitigatedDamage(100, 'Physical', { armor: defense }), expected);
    close(mitigatedDamage(100, 'Magic', { resistance: defense }), expected);
  }
  const p = { armor: 100, resistance: 50 };
  for (const type of ['Bleed', 'Chaos']) assert.equal(mitigatedDamage(20, type, p), 20);
  assert.equal(mitigatedDamage(0, 'Physical', p), 0);
  assert.equal(mitigatedDamage(0.5, 'Physical', p), 0.25);
  const heavilyMitigated = mitigatedDamage(100, 'Physical', { armor: 1e308 });
  assert.ok(Number.isFinite(heavilyMitigated) && heavilyMitigated > 0);
  close(heavilyMitigated, 100 / (100 + 1e308) * 100);
  close(mitigatedDamage(100, 'Physical', { armor: -1e308 }), 200);

  const g = new Combat(); const tank = g.party[0]; tank.armor = 100; tank.resistance = 50;
  for (const type of DAMAGE_TYPES) g.damage(tank, 20, 'test', type);
  close(tank.hp, tank.maxHp - (10 + 20 * 100 / 150 + 40));
  assert.deepEqual(g.events.filter(e => e.type === 'damage').map(e => e.damageType), DAMAGE_TYPES);
});
test('temporary defense buffs and debuffs stack, refresh by identity, and restore gear when they expire', () => {
  const encounter = { name: 'Test', maxHp: 99999, strike: { first: Infinity, every: Infinity, damage: 0 }, mechanics: [] };
  const g = new Combat(encounter); g.start();
  const tank = g.party[0]; tank.armor = 20; tank.resistance = 10; tank.maxHp = tank.hp = 10000;
  g.applyDefenseModifier('tank', { source: 'sunder', name: 'Sundered Armor', stat: 'armor', modifier: -50, duration: 8 });
  g.applyDefenseModifier(tank, { source: 'fortify', name: 'Fortify', stat: 'armor', modifier: 10, duration: 4 });
  g.applyDefenseModifier(tank, { source: 'sunder', name: 'Sundered Armor', stat: 'armor', modifier: -40, duration: 12 });
  g.applyDefenseModifier(tank, { source: 'rust', name: 'Rust', stat: 'armor', modifier: -10, duration: 6 });
  g.applyDefenseModifier(tank, { source: 'fracture', name: 'Arcane Fracture', stat: 'resistance', modifier: -25, duration: 10 });
  g.applyDefenseModifier(tank, { source: 'ward', name: 'Ward', stat: 'resistance', modifier: 5, duration: 4 });
  assert.equal(tank.defenseModifiers.length, 5);

  const take = type => {
    g.damage(tank, 100, `test-${g.time}`, type);
    return g.events.at(-1).amount;
  };
  close(take('Physical'), 100 * (2 - 100 / 120));
  close(take('Magic'), 100 * (2 - 100 / 110));

  g.step(5);
  close(take('Physical'), 100 * (2 - 100 / 130));
  close(take('Magic'), 100 * (2 - 100 / 115));
  g.step(2);
  close(take('Physical'), 100 * (2 - 100 / 120));
  g.step(5);
  close(take('Physical'), 100 * 100 / 120);
  close(take('Magic'), 100 * 100 / 110);
  assert.deepEqual(tank.defenseModifiers, []);
  assert.deepEqual(tank.debuffs, []);
  assert.deepEqual(tank.helpfulEffects, []);
});
test('every production damage source has a supported explicit type', () => {
  for (const encounter of [ENCOUNTER, ...Object.values(CHAPTER_ENCOUNTERS)]) {
    for (const source of [encounter.strike, encounter.shard, ...encounter.adds || [], ...encounter.mechanics.flatMap(m => [m, m.dot])].filter(s => s?.damage)) assert.ok(DAMAGE_TYPES.includes(source.damageType), encounter.name);
  }
});
