import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Combat } from '../src/combat.js';
import { EncounterMeter, contributionPercent } from '../src/encounter-meter.js';

test('contribution percentages use the supplied total and guard empty totals', () => {
  assert.equal(contributionPercent(25, 100), '25%');
  assert.equal(contributionPercent(0, 0), '—');
});

test('meter pins the relevant footer outside the fixed-height scrolling list', async () => {
  const [html, css, source] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/encounter-meter.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/encounter-meter.js', import.meta.url), 'utf8'),
  ]);
  assert.match(html, /class="meter-body"><\/div><div class="meter-pinned"><\/div>/);
  assert.match(css, /\.encounter-meter\s*\{[^}]*display:\s*flex/);
  assert.match(css, /\.meter-body\s*\{[^}]*flex:\s*1 1 auto;[^}]*overflow-y:\s*auto/);
  assert.match(source, /pinnedMarkup = overhealSummary\(\)/);
  assert.ok(source.includes('aria-label="${displayNumber(perSecond)} ${unit} per second, ${displayNumber(amount)} total ${unit}"'));
  assert.ok(source.includes('>(${displayNumber(perSecond)}) ${displayNumber(amount)}</strong>'));
  assert.match(source, /modeButton\.dataset\.meterMode; detail = false; previousBody = ''; previousPinned = ''; render\(\)/);
  assert.doesNotMatch(source, /previousMarkup/);
  assert.match(source, /OVERHEALING<\/span><strong>\$\{displayNumber\(meter\.totalOverheal\)\}<\/strong><small>\$\{contributionPercent\(meter\.totalOverheal, meter\.totalHealing \+ meter\.totalOverheal\)\} of attempted healing/);
  assert.doesNotMatch(source, /summary\('EFFECTIVE HEALING'/);
});

test('damage meter credits the actor, caps overkill, and retains all five sorted rows', () => {
  const game = new Combat();
  const meter = new EncounterMeter(game.party);
  game.boss.hp = 12;
  game.damageEnemy(30, 'smite', false, game.party[1]);
  meter.consume(game.drainEvents());
  const rows = meter.damageRows(3);
  assert.deepEqual(rows.map(row => row.id), ['rogue', 'tank', 'mage', 'ranger', 'priest']);
  assert.equal(rows[0].amount, 12);
  assert.equal(rows[0].perSecond, 4);
  assert.equal(meter.totalDamage, 12);
  assert.ok(rows.slice(1).every(row => row.amount === 0));
});

test('positive damage ties keep party order regardless of event order', () => {
  const game = new Combat();
  const meter = new EncounterMeter(game.party);
  meter.consume([
    { type: 'damage', target: 'boss', actor: 'mage', amount: 25 },
    { type: 'damage', target: 'boss', actor: 'ranger', amount: 30 },
    { type: 'damage', target: 'boss', actor: 'tank', amount: 25 },
    { type: 'damage', target: 'boss', actor: 'rogue', amount: 10 },
  ]);
  assert.deepEqual(meter.damageRows(5).map(row => row.id), ['ranger', 'tank', 'mage', 'rogue', 'priest']);
  assert.deepEqual(meter.damageRows(5).slice(1, 3).map(row => row.perSecond), [5, 5]);
});

test('healing meter uses effective amounts and sorts spell and effect details', () => {
  const game = new Combat();
  const meter = new EncounterMeter(game.party);
  game.party[0].hp = game.party[0].maxHp - 12;
  game.heal(game.party[0], 100, 'flash', { canCrit: false });
  game.party[1].hp = game.party[1].maxHp - 8;
  game.heal(game.party[1], 8, 'atonement', { canCrit: false });
  game.heal(game.party[1], 50, 'greater', { canCrit: false });
  meter.consume(game.drainEvents());
  assert.equal(game.stats.overheal, 138);
  assert.equal(meter.totalHealing, 20);
  assert.equal(meter.totalOverheal, 138);
  assert.deepEqual(meter.healingRows(4, game.spells).map(row => [row.name, row.amount, row.perSecond]), [
    ['Flash Heal', 12, 3], ['Atonement', 8, 2],
  ]);
});

test('healing totals remain zero with empty output and rates stay safe', () => {
  const meter = new EncounterMeter(new Combat().party);
  assert.equal(meter.totalHealing, 0);
  assert.equal(meter.totalOverheal, 0);
  assert.deepEqual(meter.healingRows(0), []);
  assert.ok(meter.damageRows(0).every(row => row.perSecond === 0));
});

test('rates use active encounter time and freeze while paused or ended', () => {
  const game = new Combat();
  const meter = new EncounterMeter(game.party);
  game.start();
  game.damageEnemy(10, 'tank', false, game.party[0]);
  meter.consume(game.drainEvents());
  game.step(2);
  const activeRate = meter.damageRows(game.time)[0].perSecond;
  game.pause(); game.step(30);
  assert.equal(game.time, 2);
  assert.equal(meter.damageRows(game.time)[0].perSecond, activeRate);
  game.pause(); game.boss.hp = 0; game.step();
  const endTime = game.time;
  game.step(30);
  assert.equal(game.time, endTime);
  assert.equal(meter.damageRows(game.time)[0].perSecond, 10 / endTime);
  meter.reset(game.party);
  assert.equal(meter.totalDamage, 0);
  assert.equal(meter.damageRows(0).length, 5);
});
