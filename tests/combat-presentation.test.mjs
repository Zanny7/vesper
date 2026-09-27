import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { partyForHealer, SHAMAN_SPELLS, CONFIG } from '../src/data.js';
import { shamanTalentLoadout } from '../src/shaman-talents.js';
import { cooldownPresentation, abilityTooltip } from '../src/ability-presentation.js';
import { healerBuffs } from '../src/healer-buffs.js';
import { partyEffects, effectDescription } from '../src/party-effects.js';
import { formatCombatNumber, formatNumber } from '../src/stats.js';

test('charge sweep and tooltip follow next recharge through 2 → 1 → 0 → 1 → 2', () => {
  const loadout = shamanTalentLoadout(partyForHealer('shaman'), SHAMAN_SPELLS, { 'flowing-riptide': 1 });
  const game = new Combat({ name: 'Training', maxHp: 1e9, strike: { first: Infinity }, mechanics: [] }, () => .99, loadout.party, loadout.spells);
  game.party.forEach(member => { member.nextAttack = Infinity; });
  game.start();
  const spell = game.spells.find(spell => spell.id === 'riptide');
  const state = () => cooldownPresentation(game, spell);
  const advance = seconds => { for (let i = 0; i < Math.round(seconds / CONFIG.step); i++) game.step(); };
  assert.equal(state().remaining, 0);
  game.begin('riptide', 'tank');
  assert.deepEqual(state(), { remaining: 6, text: '6', fraction: 1, unavailable: false });
  advance(2);
  const before = state();
  game.begin('riptide', 'tank');
  assert.equal(state().remaining, before.remaining);
  assert.equal(state().unavailable, true);
  assert.match(abilityTooltip(game, spell), /Next charge in 4s/);
  advance(4);
  assert.equal(game.availableCharges('riptide'), 1);
  assert.equal(state().unavailable, false);
  assert.equal(state().text, '6');
  assert.ok(state().fraction > .99);
  advance(6);
  assert.equal(game.availableCharges('riptide'), 2);
  assert.equal(state().remaining, 0);
  assert.equal(state().text, '');
});

test('ordinary and usable Overgrowth cooldowns share smooth progress without disabling Overgrowth', () => {
  const game = { time: 5.25, cooldowns: { normal: 10, wildGrowth: 10 } };
  assert.deepEqual(cooldownPresentation(game, { id: 'normal', cooldown: 10 }), { remaining: 4.75, text: '5', fraction: .475, unavailable: true });
  assert.equal(cooldownPresentation(game, { id: 'wildGrowth', cooldown: 10, overgrowth: true }).unavailable, false);
});

test('all player states stay off unit frames while owned HoTs and unit statuses remain', () => {
  const game = new Combat();
  game.buffs = { sanctuary: { expires: 12, reduction: .2 }, divineFervor: { expires: 15, speed: .2, manaReduction: .2 }, tidalWaves: 2, unleashLife: 1, postHaste: 2 };
  game.totem = { expires: 18 }; game.tideTotem = { expires: 12 };
  const ids = healerBuffs(game).map(buff => buff.id);
  game.healer.helpfulEffects = ids.map(source => ({ source }));
  game.healer.hots = [{ source: 'recurringSurge' }, { source: 'riptide' }, { source: 'rejuvenation' }, { source: 'regrowth' }, { source: 'wildGrowth' }, { source: 'lingering-prayer' }];
  game.healer.helpfulEffects.push({ source: 'cenarionWardArmed' }, { id: 'futureProc', displayScope: 'player' }, { id: 'unitShield', displayScope: 'unit' });
  const shown = partyEffects(game.healer, 0).helpful.map(effect => effect.source || effect.id);
  assert.ok(ids.every(id => !shown.includes(id)));
  assert.ok(game.healer.hots.every(hot => shown.includes(hot.source)));
  assert.ok(shown.includes('cenarionWardArmed') && shown.includes('unitShield'));
  assert.ok(!shown.includes('futureProc'));
});

test('encounter numbers round at display boundary and leave combat precision intact', () => {
  assert.equal(formatCombatNumber(67.5), '68');
  assert.equal(formatCombatNumber(2.52), '3');
  assert.equal(formatNumber(2.52), '2.5'); // separate timers/stat formatting
  const hot = { name: 'Riptide', heal: 32.4, ticks: 6, flowingRiptide: true };
  assert.match(effectDescription(hot, 0), /194 healing/);
  assert.equal(hot.heal, 32.4);
  const game = new Combat(); game.start(); game.party[0].hp = 100;
  game.heal(game.party[0], 2.52, 'probe');
  assert.equal(game.events.at(-1).amount, 2.52);
  assert.equal(formatCombatNumber(game.events.at(-1).amount), '3');
});
