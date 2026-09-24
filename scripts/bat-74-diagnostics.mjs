import { Combat } from '../src/combat.js';
import { CHAPTERS, CHAPTER_ENCOUNTERS, ENCOUNTER, PARTY } from '../src/data.js';

const seeded = seed => () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
const missing = member => member.maxHp - member.hp;
const ready = (game, id) => (game.cooldowns[id] || 0) <= game.time + 1e-6;

function oldDefault(game) {
  const living = game.party.filter(p => p.hp > 0);
  const lowest = [...living].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  const injured = living.filter(p => missing(p) >= 70), tank = game.party[0];
  if (injured.length >= 3) game.begin('prayer', lowest.id);
  else if (tank.hp < 360 && ready(game, 'penance')) game.begin('penance', 'tank');
  else if (lowest.hp / lowest.maxHp < .48) game.begin('flash', lowest.id);
  else if (missing(tank) >= 160) game.begin('greater', 'tank');
  else if (missing(lowest) >= 100) game.begin('flash', lowest.id);
}

function current(game) {
  const living = game.party.filter(p => p.hp > 0);
  const lowest = [...living].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  const injured = living.filter(p => missing(p) > 55);
  if (missing(lowest) >= 100 && ready(game, 'penance') && game.begin('penance', lowest.id).ok) return;
  if (injured.length >= 3 && injured.reduce((sum, member) => sum + Math.min(100, missing(member)), 0) >= 240 && game.begin('prayer', lowest.id).ok) return;
  if (missing(game.party[0]) >= 140 && game.begin('greater', 'tank').ok) return;
  if (missing(lowest) >= 105 && game.begin('flash', lowest.id).ok) return;
  if (game.mana > game.maxMana * .8 && ready(game, 'holyFire')) game.begin('holyFire', 'boss');
}

function efficient(game) {
  const living = game.party.filter(p => p.hp > 0);
  const tank = game.party[0];
  const lowest = [...living].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  const prayerValue = living.reduce((sum, member) => sum + Math.min(100, missing(member)), 0);
  if (tank.hp <= 130 && ready(game, 'penance') && game.begin('penance', 'tank').ok) return;
  if (prayerValue >= 350 && game.begin('prayer', lowest.id).ok) return;
  if (missing(tank) >= 180 && game.begin('greater', 'tank').ok) return;
  if (missing(lowest) >= 180 && game.begin('greater', lowest.id).ok) return;
  if (missing(tank) >= 120 && ready(game, 'penance') && game.begin('penance', 'tank').ok) return;
  if (lowest.hp <= 100 && game.begin('flash', lowest.id).ok) return;
  if (game.mana > game.maxMana * .8 && ready(game, 'holyFire')) game.begin('holyFire', 'boss');
}

function oldCampaign(game) {
  const living = game.party.filter(p => p.hp > 0), tank = game.party[0];
  const lowest = [...living].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (lowest.hp / lowest.maxHp < .5 && ready(game, 'penance')) game.begin('penance', lowest.id);
  else if (lowest.hp / lowest.maxHp < .4) game.begin('flash', lowest.id);
  else if (living.filter(p => missing(p) >= 65).length >= 3) game.begin('prayer', lowest.id);
  else if (missing(tank) >= 180) game.begin('greater', 'tank');
  else if (missing(lowest) >= 90) game.begin('flash', lowest.id);
}

function run(encounter, seed, party, policy) {
  const game = new Combat(encounter, seeded(seed), party);
  game.start();
  const casts = {}, rawHeals = {}, effectiveHeals = {}, damage = {};
  while (game.status === 'running' && game.time < 150) {
    if (!game.cast) policy(game);
    game.step();
    for (const event of game.drainEvents()) {
      if (event.type === 'cast') casts[event.spell] = (casts[event.spell] || 0) + 1;
      if (event.type === 'heal') {
        rawHeals[event.spell] = (rawHeals[event.spell] || 0) + event.raw;
        effectiveHeals[event.spell] = (effectiveHeals[event.spell] || 0) + event.amount;
      }
      if (event.type === 'damage' && event.target !== 'boss') damage[event.source] = (damage[event.source] || 0) + event.amount;
    }
  }
  return { status: game.status, time: +game.time.toFixed(2), bossHp: game.boss.hp, mana: +game.mana.toFixed(2), hp: game.party.map(p => +p.hp.toFixed(2)), stats: game.stats, casts, rawHeals, effectiveHeals, damage };
}

for (const [name, policy] of [['oldDefault', oldDefault], ['current', current], ['efficient', efficient]]) {
  console.log(name, JSON.stringify(run(ENCOUNTER, 1, PARTY, policy)));
  console.log(name + 'Warden', JSON.stringify(run(CHAPTER_ENCOUNTERS.warden, 1, PARTY, policy)));
}
const legacyParty = PARTY.map(p => p.label === 'HEALER' ? { ...p, maxMana: 1200, manaRegen: 4 } : p);
const campaign = [];
for (const chapter of CHAPTERS.slice(1)) for (const node of chapter.nodes) for (let seed = 1; seed <= 20; seed++) {
  campaign.push({ encounter: node.encounter, seed, ...run(CHAPTER_ENCOUNTERS[node.encounter], seed, legacyParty, oldCampaign) });
}
const normals = campaign.filter(r => !CHAPTERS.some(chapter => chapter.nodes.some(node => node.encounter === r.encounter && node.kind === 'boss')));
console.log('normalSummary', JSON.stringify({ count: normals.length, wins: normals.filter(r => r.status === 'victory').length, minEffective: Math.min(...normals.map(r => r.stats.effective)), maxTime: Math.max(...normals.map(r => r.time)), minMana: Math.min(...normals.map(r => r.mana)), maxDeaths: Math.max(...normals.map(r => r.stats.deaths)) }));
const briar = campaign.find(r => r.encounter === 'briar' && r.seed === 1);
console.log('briarSeed1', JSON.stringify(briar));
const duchess = campaign.filter(r => r.encounter === 'duchess');
console.log('duchessLegacy', JSON.stringify({ count: duchess.length, wins: duchess.filter(r => r.status === 'victory').length, first: duchess[0] }));
const wardens = Array.from({ length: 20 }, (_, i) => run(CHAPTER_ENCOUNTERS.warden, i + 1, PARTY, current));
console.log('wardenSeeds', JSON.stringify({ wins: wardens.filter(r => r.status === 'victory').length, deaths: Math.max(...wardens.map(r => r.stats.deaths)), time: [Math.min(...wardens.map(r => r.time)), Math.max(...wardens.map(r => r.time))], mana: [Math.min(...wardens.map(r => r.mana)), Math.max(...wardens.map(r => r.mana))], effective: [Math.min(...wardens.map(r => r.stats.effective)), Math.max(...wardens.map(r => r.stats.effective))] }));
const updated = [];
for (const chapter of CHAPTERS.slice(1)) for (const node of chapter.nodes) for (let seed = 1; seed <= 20; seed++) updated.push({ encounter: node.encounter, seed, ...run(CHAPTER_ENCOUNTERS[node.encounter], seed, legacyParty, efficient) });
console.log('updatedCampaign', JSON.stringify({ wins: updated.filter(r => r.status === 'victory').length, defeats: updated.filter(r => r.status !== 'victory').reduce((out, r) => { out[r.encounter] = (out[r.encounter] || 0) + 1; return out; }, {}), below400: updated.filter(r => r.stats.effective <= 400).reduce((out, r) => { out[r.encounter] = (out[r.encounter] || 0) + 1; return out; }, {}) }));
