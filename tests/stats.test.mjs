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
  close(healingParts(byId('flash'), 10).direct, 110);
  close(healingParts(byId('prayer'), 10).direct, 110);
  close(healingParts(byId('penance'), 10).direct, 260);
  close(healingParts(byId('rejuvenation'), 10).hotTick, 27);
  close(healingParts(byId('wildGrowth'), 10).hotTick, 11.25);
  const growth = healingParts(byId('regrowth'), 10);
  close(growth.direct, 50 * 180 / 170); close(growth.hotTick, 20 * 180 / 170); close(growth.direct + growth.hotTick * 6, 180);
});
test('combat delivers scaled healing for every kit spell without per-tick bonus inflation', () => {
  for (const id of ['priest', 'druid']) for (const spell of HEALERS[id].combatSpells) {
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
test('flat mitigation applies per event only to matching types, with a floor of one', () => {
  const p = { armor: 7, resistance: 3 };
  assert.equal(mitigatedDamage(20, 'Physical', p), 13); assert.equal(mitigatedDamage(20, 'Magic', p), 17);
  for (const type of ['Bleed', 'Chaos']) assert.equal(mitigatedDamage(20, type, p), 20);
  assert.equal(mitigatedDamage(2, 'Physical', p), 1); assert.equal(mitigatedDamage(0, 'Physical', p), 0);
  const g = new Combat(); const tank = g.party[0]; tank.armor = 7; tank.resistance = 3;
  for (const type of DAMAGE_TYPES) g.damage(tank, 20, 'test', type);
  assert.equal(tank.hp, tank.maxHp - 70);
  assert.deepEqual(g.events.filter(e => e.type === 'damage').map(e => e.damageType), DAMAGE_TYPES);
});
test('every production damage source has a supported explicit type', () => {
  for (const encounter of [ENCOUNTER, ...Object.values(CHAPTER_ENCOUNTERS)]) {
    for (const source of [encounter.strike, encounter.shard, ...encounter.adds || [], ...encounter.mechanics.flatMap(m => [m, m.dot])].filter(s => s?.damage)) assert.ok(DAMAGE_TYPES.includes(source.damageType), encounter.name);
  }
});
