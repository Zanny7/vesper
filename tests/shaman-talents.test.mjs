import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/combat.js';
import { CONFIG, CHAPTERS, SHAMAN_SPELLS, SHAMAN_TALENT_VALUES as values, partyForHealer } from '../src/data.js';
import { shamanTalentLoadout } from '../src/shaman-talents.js';
import { TALENT_TREES } from '../src/talent-trees.js';
import { TalentProgression, validateTalentTree } from '../src/talents.js';
import { createAbilitySettings } from '../src/ability-settings.js';
import { abilityTooltip } from '../src/ability-presentation.js';
import { healerBuffs } from '../src/healer-buffs.js';
import { partyEffects, effectDescription } from '../src/party-effects.js';

const training = { name: 'Training', maxHp: 100000, strike: { first: Infinity, every: Infinity, damage: 0 }, mechanics: [] };
const storage = () => { const data = new Map(); return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }; };
function setup(allocations = {}, stats = {}) {
  const party = partyForHealer('shaman').map(member => ({ ...member, maxHp: 10000, damage: 0,
    ...(member.label === 'HEALER' ? { manaRegen: 0, maxMana: 10000, ...stats } : {}) }));
  const loadout = shamanTalentLoadout(party, SHAMAN_SPELLS, allocations);
  const game = new Combat(training, () => .99, loadout.party, loadout.spells);
  game.start(); game.party.forEach(member => { member.hp = 100; member.nextAttack = Infinity; });
  return game;
}
const advance = (game, seconds) => { for (let i = 0; i < Math.round(seconds / CONFIG.step); i++) game.step(); };
const finish = game => { while (game.cast) game.step(); };
const cast = (game, id, target = 'tank') => { assert.equal(game.begin(id, target).ok, true); finish(game); };
const spell = (game, id) => game.spells.find(spell => spell.id === id);
const heals = (game, id) => game.events.filter(event => event.type === 'heal' && event.spell === id);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
const hot = (game, id, member = game.party[0]) => member.hots.find(hot => hot.source === id);
const pending = effect => effect.bankedHealing?.reduce((sum, heal) => sum + heal, 0) ?? effect.heal * effect.ticks;

test('Shaman has 12 nodes, 17 ranks, 6/5/3/3 row ranks and eight independently earned points', () => {
  const tree = TALENT_TREES.shaman;
  assert.deepEqual(validateTalentTree(tree), []);
  assert.equal(tree.length, 12);
  assert.equal(tree.reduce((sum, talent) => sum + (talent.maxRank || 1), 0), 17);
  assert.deepEqual([1, 2, 3, 4].map(row => tree.filter(talent => talent.row === row).reduce((sum, talent) => sum + (talent.maxRank || 1), 0)), [6, 5, 3, 3]);
  const disk = storage(), talents = new TalentProgression(disk, TALENT_TREES);
  for (const chapter of CHAPTERS) for (const node of chapter.nodes) talents.awardEncounter('shaman', chapter, node);
  assert.equal(talents.state('shaman').earnedPoints, 8);
  assert.equal(talents.state('priest').earnedPoints, 0);
  assert.equal(talents.spend('shaman', 'tidal-waves').ok, false);
  for (const id of ['tidal-reserves', 'tidal-reserves', 'tidal-waves', 'high-tide', 'flowing-riptide', 'echoing-surge', 'earthliving', 'healing-tide-totem']) assert.equal(talents.spend('shaman', id).ok, true);
  assert.equal(talents.state('shaman').spentPoints, 8);
  assert.equal(talents.spend('shaman', 'ancestral-echo').ok, false);
  assert.equal(talents.refund('shaman', 'tidal-waves').ok, true);
  assert.equal(new TalentProgression(disk, TALENT_TREES).state('shaman').spentPoints, 7);
  assert.equal(talents.refund('shaman', 'tidal-reserves').ok, true);
  assert.equal(talents.refund('shaman', 'tidal-reserves').ok, false);
  talents.respec('shaman'); assert.equal(talents.state('shaman').unspentPoints, 8);
  talents.isCombatActive = () => true;
  assert.equal(talents.spend('shaman', 'tidal-reserves').ok, false);
  assert.equal(talents.respec('shaman').ok, false);
});

test('BAT-85 v1 save retains Shaman milestones and other healers without a version migration', () => {
  const disk = storage();
  disk.setItem('vesper-talents-v1', JSON.stringify({ version: 1, healers: {
    shaman: { milestones: ['chapter-1:first', 'chapter-1:boss'], allocations: {} },
    priest: { milestones: ['chapter-1:first'], allocations: { 'binding-light': 1 } },
  } }));
  const talents = new TalentProgression(disk, TALENT_TREES);
  assert.equal(talents.state('shaman').earnedPoints, 2);
  assert.equal(talents.spend('shaman', 'deep-riptide').ok, true);
  assert.deepEqual(new TalentProgression(disk, TALENT_TREES).state('priest').allocations, { 'binding-light': 1 });
});

test('both ranks scale regeneration, Riptide periodic only, High Tide and Stream without mutating baseline', () => {
  const original = JSON.stringify(SHAMAN_SPELLS);
  for (const rank of [1, 2]) {
    const game = setup({ 'tidal-reserves': rank, 'deep-riptide': rank, 'high-tide': rank, 'restorative-stream': rank }, { manaRegen: 3 });
    near(game.healer.manaRegen, 3 * (1 + rank * .1));
    const riptide = game.resolveSpell(spell(game, 'riptide'));
    near(riptide.direct, 40); near(riptide.hot.tick, 27 * (1 + rank * .1));
    const chain = game.resolveSpell(spell(game, 'chainHeal'));
    near(chain.chain[0], 105); near(chain.chain[4], 105 * (1 - values.highTide.jumpLossByRank[rank]) ** 4);
    near(game.resolveSpell(spell(game, 'healingStream')).totem.tick, 32 * (1 + rank * .15));
  }
  assert.equal(JSON.stringify(SHAMAN_SPELLS), original);
});

test('Tidal Momentum checks own Surge at completion, scales direct once and does not buff Earthliving', () => {
  for (const rank of [1, 2]) {
    const game = setup({ 'tidal-momentum': rank, earthliving: 1 }, { spellPower: 30 });
    cast(game, 'healingWave'); near(heals(game, 'healingWave')[0].raw, 140);
    near(hot(game, 'recurringSurge').heal, 54);
    cast(game, 'healingWave'); near(heals(game, 'healingWave')[1].raw, 140 * (1 + rank * .1));
    const another = setup({ 'tidal-momentum': rank });
    cast(another, 'recurringSurge'); advance(another, 4);
    cast(another, 'healingWave'); near(heals(another, 'healingWave')[0].raw, 110);
  }
});

test('Tidal Waves stores two non-expiring charges, replaces on Riptide, consumes only Wave/Chain', () => {
  const game = setup({ 'tidal-waves': 1, 'flowing-riptide': 1 });
  cast(game, 'riptide'); assert.equal(game.buffs.tidalWaves, 2);
  cast(game, 'riptide', 'rogue'); assert.equal(game.buffs.tidalWaves, 2);
  cast(game, 'recurringSurge'); assert.equal(game.buffs.tidalWaves, 2);
  advance(game, 20); assert.equal(game.buffs.tidalWaves, 2);
  game.begin('healingWave', 'tank'); near(game.cast.duration, 2); game.cancel(); assert.equal(game.buffs.tidalWaves, 2);
  cast(game, 'healingWave'); assert.equal(game.buffs.tidalWaves, 1);
  game.begin('chainHeal', 'tank'); near(game.cast.duration, 2); finish(game);
  assert.equal(game.buffs.tidalWaves, undefined);
  assert.equal(game.healer.helpfulEffects.some(effect => effect.source === 'tidalWaves'), false);
});

test('Waves and Double Current multiply with gear Haste and preserve both reservations on cancellation/dead target', () => {
  const game = setup({ 'tidal-waves': 1, 'double-current': 1 }, { haste: 25 });
  cast(game, 'riptide'); cast(game, 'unleashLife');
  game.begin('healingWave', 'tank'); near(game.cast.duration, 2.5 / 1.25 * .8 * .8);
  near(game.cast.manaCost, 28);
  const buffs = healerBuffs(game);
  for (const id of ['tidalWaves', 'unleashLife']) {
    assert.equal(buffs.find(buff => buff.id === id).stacks, 1);
    assert.equal(buffs.find(buff => buff.id === id).reserved, 1);
  }
  game.cancel(); assert.equal(game.buffs.unleashLife, 2); assert.equal(game.buffs.tidalWaves, 2);
  game.begin('healingWave', 'rogue'); game.damage(game.party[1], 100000, 'test'); finish(game);
  assert.equal(game.buffs.unleashLife, 2); assert.equal(game.buffs.tidalWaves, 2);
  cast(game, 'healingWave'); assert.equal(game.buffs.unleashLife, 1); assert.equal(game.buffs.tidalWaves, 1);
  cast(game, 'chainHeal'); assert.equal(game.buffs.unleashLife, undefined); assert.equal(game.buffs.tidalWaves, undefined);
});

test('Double Current grants two complete bonuses and replaces rather than stacking stored empowerment', () => {
  const game = setup({ 'double-current': 1 });
  cast(game, 'unleashLife'); advance(game, 15); cast(game, 'unleashLife');
  assert.equal(game.buffs.unleashLife, 2);
  cast(game, 'healingWave'); near(heals(game, 'healingWave')[0].raw, 132);
  assert.equal(game.buffs.unleashLife, 1);
  cast(game, 'recurringSurge'); near(hot(game, 'recurringSurge').heal, 52.8);
  assert.equal(game.buffs.unleashLife, undefined);
});

test('Flowing Riptide charges recharge sequentially, pausing freezes recharge and reset restores both', () => {
  const game = setup({ 'flowing-riptide': 1 });
  cast(game, 'riptide'); cast(game, 'riptide', 'rogue'); assert.equal(game.availableCharges('riptide'), 0);
  assert.equal(game.begin('riptide', 'mage').ok, false);
  game.pause(); advance(game, 12); assert.equal(game.availableCharges('riptide'), 0); game.pause();
  advance(game, 6); assert.equal(game.availableCharges('riptide'), 1);
  advance(game, 6); assert.equal(game.availableCharges('riptide'), 2);
  cast(game, 'riptide'); game.reset(); assert.equal(game.availableCharges('riptide'), 2);
});

test('Flowing recast releases old pending healing before the new direct heal, with no duplicated pending ticks', () => {
  const game = setup({ 'flowing-riptide': 1, 'deep-riptide': 2 }, { spellPower: 40 });
  cast(game, 'riptide'); advance(game, 3);
  const old = hot(game, 'riptide'), budget = pending(old), tick = old.heal;
  cast(game, 'riptide');
  near(heals(game, 'flowing-riptide')[0].raw, budget);
  const recent = game.events.filter(event => event.type === 'heal').slice(-2);
  assert.deepEqual(recent.map(event => event.spell), ['flowing-riptide', 'riptide']);
  assert.equal(game.party[0].hots.length, 1);
  near(hot(game, 'riptide').heal, tick); assert.equal(hot(game, 'riptide').ticks, 6);
  advance(game, 18);
  assert.equal(heals(game, 'riptide').length, 9); // Two direct events, one old tick, six new ticks.
  near(heals(game, 'flowing-riptide').reduce((sum, event) => sum + event.raw, 0), budget);
});

test('Flowing movement preserves object, expiry, next tick and pending budget without later-slot duplication', () => {
  const game = setup({ 'flowing-riptide': 1 });
  cast(game, 'riptide'); const effect = hot(game, 'riptide'), expiry = effect.expires;
  game.party[0].hp = 9500; game.party[1].hp = 100;
  advance(game, 3);
  assert.equal(hot(game, 'riptide'), undefined);
  assert.equal(hot(game, 'riptide', game.party[1]), effect);
  near(effect.expires, expiry); near(effect.next, 6); near(pending(effect), 135);
  assert.equal(heals(game, 'riptide').length, 2);
  advance(game, 15); assert.equal(heals(game, 'riptide').length, 7);
});

test('Flowing movement excludes dead, full-health and already-Riptide allies and uses strict post-tick 90% threshold', () => {
  const game = setup({ 'flowing-riptide': 1 });
  cast(game, 'riptide'); cast(game, 'riptide', 'rogue');
  game.party[0].hp = 8973; game.party[2].hp = 0; game.party[3].hp = 10000; game.healer.hp = 300;
  advance(game, 3); assert.ok(hot(game, 'riptide')); // Exactly 90%, no transfer.
  advance(game, 3);
  assert.equal(hot(game, 'riptide'), undefined); assert.ok(hot(game, 'riptide', game.healer));
  assert.equal(heals(game, 'riptide').filter(event => Math.abs(event.time - 6) < 1e-7).length, 2);
});

test('Flowing conservation survives a Haste change and no destination without hidden healing', () => {
  const game = setup({ 'flowing-riptide': 1 }, { haste: 20 });
  cast(game, 'riptide'); const initialBudget = pending(hot(game, 'riptide'));
  game.party.forEach(member => { member.hp = member.maxHp; });
  game.healer.haste = 50;
  advance(game, 18);
  near(heals(game, 'riptide').slice(1).reduce((sum, event) => sum + event.raw, 0), initialBudget);
  assert.equal(game.party.flatMap(member => member.hots).length, 0);
});

test('Echoing Surge uses effective healing, includes the healer, excludes primary/dead/full allies and cannot echo/Crit again', () => {
  const game = setup({ 'echoing-surge': 1 }, { crit: 100 });
  cast(game, 'recurringSurge');
  game.party[0].hp = 9970; game.party[1].hp = 0; game.party[2].hp = 10000; game.party[3].hp = 10000;
  advance(game, 2);
  const echoes = heals(game, 'echoing-surge'); assert.equal(echoes.length, 1);
  assert.equal(echoes[0].target, 'shaman'); near(echoes[0].raw, 15); assert.equal(echoes[0].critical, false);
  advance(game, 4); assert.equal(heals(game, 'echoing-surge').length, 1); // Primary full, no more echo.
});

test('Ancestral Echo uses only Wave effective healing with Momentum/Unleash and cannot echo Earthliving or Crit twice', () => {
  const game = setup({ 'ancestral-echo': 1, 'tidal-momentum': 2, earthliving: 1 }, { crit: 100 });
  cast(game, 'recurringSurge'); cast(game, 'unleashLife'); cast(game, 'healingWave');
  near(heals(game, 'healingWave')[0].raw, 110 * 1.2 * 1.2 * 1.5);
  near(heals(game, 'ancestral-echo')[0].raw, 110 * 1.2 * 1.2 * 1.5 * .4);
  assert.equal(heals(game, 'ancestral-echo')[0].critical, false);
  advance(game, 4); assert.equal(heals(game, 'ancestral-echo').length, 1);
  const clipped = setup({ 'ancestral-echo': 1 }, { crit: 100 });
  clipped.party[0].hp = 9990; cast(clipped, 'healingWave'); near(heals(clipped, 'ancestral-echo')[0].raw, 4);
  cast(clipped, 'healingWave'); assert.equal(heals(clipped, 'ancestral-echo').length, 1);
});

test('Earthliving Wave adds a full Surge; Chain creates exactly one normal tick per hit with Spell Power once', () => {
  const game = setup({ earthliving: 1 }, { spellPower: 30 });
  cast(game, 'healingWave');
  const bank = hot(game, 'recurringSurge'); near(bank.expires - game.time, 6);
  assert.deepEqual(bank.bankedHealing, [54, 54, 54]);
  const chain = setup({ earthliving: 1 }, { spellPower: 30 });
  cast(chain, 'chainHeal');
  for (const member of chain.party) {
    const bank = hot(chain, 'recurringSurge', member);
    near(bank.expires - chain.time, 2); assert.deepEqual(bank.bankedHealing, [54]);
  }
  advance(chain, 2); assert.equal(heals(chain, 'recurringSurge').length, 5);
  assert.equal(chain.party.flatMap(member => member.hots).length, 0);
});

test('Earthliving preserves next ticks, clips at 18s, and empowered extensions never rescale existing queued healing', () => {
  const game = setup({ earthliving: 1, 'double-current': 1 }, { spellPower: 30 });
  cast(game, 'recurringSurge'); const bank = hot(game, 'recurringSurge'), next = bank.next;
  cast(game, 'unleashLife'); cast(game, 'healingWave');
  near(bank.next, next + 2);
  assert.deepEqual(bank.bankedHealing, [54, 54, 64.8, 64.8, 64.8]);
  for (let i = 0; i < 12; i++) cast(game, 'healingWave');
  assert.ok(bank.expires <= game.time + 18 + 1e-7);
  assert.equal(bank.ticks, bank.bankedHealing.length);
  const due = bank.next <= bank.expires + 1e-8 ? Math.floor((bank.expires - bank.next) / bank.interval + 1e-8) + 1 : 0;
  assert.equal(bank.ticks, due);
  advance(game, 18); assert.equal(hot(game, 'recurringSurge'), undefined);
});

test('Earthliving Chain extends each existing Surge by only 2s and respects its phase and cap', () => {
  const game = setup({ earthliving: 1 });
  cast(game, 'recurringSurge'); const bank = hot(game, 'recurringSurge');
  const expires = bank.expires, next = bank.next;
  cast(game, 'chainHeal'); near(bank.expires, expires + 2); near(bank.next, next + 2);
  assert.equal(bank.bankedHealing.length, 3); // One old tick landed, only one new tick added.
  const capped = setup({ earthliving: 1 });
  for (let i = 0; i < 7; i++) cast(capped, 'recurringSurge');
  const existing = hot(capped, 'recurringSurge'); cast(capped, 'chainHeal');
  assert.ok(existing.expires <= capped.time + 18 + 1e-7);
  assert.equal(existing.ticks, existing.bankedHealing.length);
});

test('Earthliving-created Surge triggers exactly one effective Echo per tick, including Unleash bonus once', () => {
  const game = setup({ earthliving: 1, 'echoing-surge': 1 });
  cast(game, 'unleashLife'); cast(game, 'chainHeal'); advance(game, 2);
  assert.equal(heals(game, 'recurringSurge').length, 5);
  assert.equal(heals(game, 'echoing-surge').length, 5);
  for (const event of heals(game, 'recurringSurge')) near(event.raw, 52.8);
  for (const event of heals(game, 'echoing-surge')) near(event.raw, 26.4);
});

test('Tide matches reviewed values, scales shared stats and ticks every living ally eight times while casting', () => {
  const game = setup({ 'healing-tide-totem': 1 }, { spellPower: 40, haste: 25, crit: 100 });
  const tide = spell(game, 'healingTide'), resolved = game.resolveSpell(tide);
  near(resolved.cost, 80); near(resolved.duration, 0); near(tide.cooldown, 60);
  near(resolved.totem.tick, 19); assert.equal(resolved.totem.ticks, 8);
  game.party[2].hp = 0;
  cast(game, 'healingTide'); game.begin('healingWave', 'tank');
  advance(game, 1); assert.ok(game.cast);
  assert.equal(heals(game, 'healingTide').length, 4);
  near(heals(game, 'healingTide')[0].raw, 28.5);
  advance(game, 7); assert.equal(heals(game, 'healingTide').length, 32);
  assert.equal(game.tideTotem, null);
  assert.equal(game.healer.helpfulEffects.some(effect => effect.source === 'healingTide'), false);
  assert.equal(game.begin('healingTide').ok, false);
});

test('Tide and rank-2 Stream coexist independently, waste full-health ticks, and replacement cannot duplicate', () => {
  const game = setup({ 'healing-tide-totem': 1, 'restorative-stream': 2 });
  cast(game, 'healingStream'); cast(game, 'healingTide');
  assert.ok(game.totem); assert.ok(game.tideTotem);
  game.party.forEach(member => { member.hp = member.maxHp; }); advance(game, 2);
  assert.equal(heals(game, 'healingTide').length, 10);
  assert.equal(heals(game, 'healingTide')[0].amount, 0);
  assert.equal(heals(game, 'healingStream').length, 0);
  game.party[0].hp = 100; advance(game, 2);
  near(heals(game, 'healingStream')[0].raw, 41.6);
  for (const event of heals(game, 'healingTide')) near(event.raw, 14);
  game.cooldowns.healingTide = game.time; cast(game, 'healingTide');
  advance(game, 8); assert.equal(game.events.filter(event => event.type === 'totemTick' && event.spell === 'healingTide').length, 12);
  assert.equal(game.totem, null); assert.equal(game.tideTotem, null);
});

test('pause, target death, healer death, victory/defeat and reset clear or freeze talent effects appropriately', () => {
  const allocations = { 'healing-tide-totem': 1, 'tidal-waves': 1, 'double-current': 1, earthliving: 1, 'flowing-riptide': 1 };
  for (const ending of ['death', 'victory', 'defeat', 'reset']) {
    const game = setup(allocations); cast(game, 'riptide'); cast(game, 'unleashLife'); cast(game, 'healingStream'); cast(game, 'healingTide'); cast(game, 'healingWave');
    game.begin('chainHeal', 'tank');
    const time = game.time, pendingTide = game.tideTotem.ticks;
    game.pause(); advance(game, 10); near(game.time, time); assert.equal(game.tideTotem.ticks, pendingTide); game.pause();
    game.damage(game.party[1], 100000, 'test'); assert.equal(game.party[1].hots.length, 0);
    if (ending === 'death') game.damage(game.healer, 100000, 'test');
    else if (ending === 'reset') game.reset();
    else { if (ending === 'victory') game.boss.hp = 0; else game.time = CONFIG.enrage; game.step(); }
    assert.equal(game.cast, null); assert.equal(game.totem, null); assert.equal(game.tideTotem, null);
    assert.equal(game.buffs.tidalWaves, undefined); assert.equal(game.buffs.unleashLife, undefined);
    assert.equal(game.party.flatMap(member => member.hots).length, 0);
    assert.equal(game.party.flatMap(member => member.helpfulEffects).length, 0);
  }
});

test('Tide order/keybind persist through reload and refund/relearn while preserving baseline preferences', () => {
  const disk = storage();
  disk.setItem('vesper-abilities-v1-shaman', JSON.stringify({ order: ['chainHeal', 'recurringSurge'], bindings: { chainHeal: 'Q' } }));
  const settings = createAbilitySettings(disk);
  const load = allocations => shamanTalentLoadout(partyForHealer('shaman'), settings.spells('shaman'), allocations).spells;
  assert.equal(settings.spells('shaman', load({ 'healing-tide-totem': 1 }))[0].key, 'Q');
  assert.equal(settings.bind('shaman', 'healingTide', 'Shift+T').ok, true);
  settings.move('shaman', 'healingTide', 'chainHeal');
  assert.equal(settings.spells('shaman', load({})).some(spell => spell.id === 'healingTide'), false);
  const restored = createAbilitySettings(disk).spells('shaman', load({ 'healing-tide-totem': 1 }));
  assert.equal(restored[0].id, 'healingTide'); assert.equal(restored[0].key, 'Shift+T'); assert.equal(restored[1].key, 'Q');
  assert.deepEqual(settings.spells('druid').map(spell => spell.key), ['1', '2', '3', '4', '5']);
});

test('configured tooltips and effect UI expose charges, budgets, thresholds, Totems and reserved buffs', () => {
  const game = setup(Object.fromEntries(TALENT_TREES.shaman.map(talent => [talent.id, talent.maxRank || 1])));
  cast(game, 'riptide'); cast(game, 'unleashLife'); cast(game, 'healingStream'); cast(game, 'healingTide');
  const tooltip = id => abilityTooltip(game, spell(game, id), game.party[0]);
  assert.match(tooltip('healingTide'), /14 healing per living ally every 1s for 8s/);
  assert.match(tooltip('healingTide'), /80 Mana/);
  assert.match(tooltip('riptide'), /1\/2 charges; one recharges every 6s/);
  assert.match(tooltip('riptide'), /above 90%/);
  assert.match(tooltip('riptide'), /194.4 remaining periodic healing/);
  assert.match(tooltip('unleashLife'), /Store 2 empowerments/);
  assert.match(tooltip('chainHeal'), /Earthliving.*2s/);
  assert.match(tooltip('healingWave'), /Tidal Momentum: 20%/);
  assert.match(tooltip('healingWave'), /Ancestral Echo.*40%/);
  game.begin('healingWave', 'tank');
  const buffs = healerBuffs(game);
  assert.equal(buffs.find(buff => buff.id === 'unleashLife').reserved, 1);
  assert.equal(buffs.find(buff => buff.id === 'tidalWaves').reserved, 1);
  assert.ok(partyEffects(game.healer, game.time).helpful.some(effect => effect.source === 'healingTide'));
  assert.match(effectDescription(hot(game, 'riptide'), game.time), /194.4 healing in 6 remaining ticks/);
});
