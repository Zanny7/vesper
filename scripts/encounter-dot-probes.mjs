// BAT-91: actual post-BAT-92 Shaman gear and unchanged spell resolution.
import { writeFileSync } from 'node:fs';
import { Combat } from '../src/combat.js';
import { CHAPTERS, CHAPTER_ENCOUNTERS, HEALERS } from '../src/data.js';
import { shamanTalentLoadout } from '../src/shaman-talents.js';
import { shamanBuilds } from './shaman-policy.mjs';
import { chapterBuilds } from './encounter-pressure.mjs';
import { seeded, routes, recursiveInheritedEquipment, acquireRoute, regeared } from './boss-balance.mjs';
const rows = [];
for (const stage of ['first', 'ready']) for (let index = 0; index < 16; index++) {
  const seed = 950000 + index, random = seeded(seed), chapter = CHAPTERS[3];
  let equipment = recursiveInheritedEquipment(3, 'shaman', 'veryGood', seed, random).equipment;
  if (stage === 'ready') for (let i = 0; i < 3; i++) {
    acquireRoute(chapter, routes(chapter)[i % 4], equipment, 'shaman', random);
    equipment = regeared(equipment, 'shaman');
  }
  for (const build of chapterBuilds[3]) {
    const loadout = shamanTalentLoadout(equipment.party('shaman'), HEALERS.shaman.combatSpells, shamanBuilds[build]);
    const game = new Combat(CHAPTER_ENCOUNTERS.huntsman, random, loadout.party, loadout.spells);
    const profile = id => game.resolveSpell(game.spells.find(s => s.id === id)).hot;
    const r = profile('riptide'), s = profile('recurringSurge');
    rows.push({ stage, seed, build, spellPower: game.spellPower, maxMana: game.maxMana,
      riptideHps: r.tick / r.interval, surgeHps: s.tick / s.interval,
      combinedHps: r.tick / r.interval + s.tick / s.interval,
      nonTankHealth: game.party.filter(p => p.id !== 'tank').map(p => p.maxHp) });
  }
}
const mechanics = ['roses', 'procession', 'huntsman', 'chapel', 'leech', 'hounds', 'garden', 'duchess']
  .flatMap(id => CHAPTER_ENCOUNTERS[id].mechanics.filter(m => m.dot).map(m => ({ encounter: id, name: m.name,
    tier: m.dot.damage <= 30 ? 'weak' : m.dot.damage <= 68 ? 'medium' : 'strong',
    targets: m.count, application: m.target === 'rotating' ? 'sequential' : 'simultaneous',
    hpsPerTarget: m.dot.damage / m.dot.interval, seconds: m.dot.ticks * m.dot.interval,
    totalPerTarget: m.dot.damage * m.dot.ticks, every: m.every })));
writeFileSync(process.argv[2] || 'docs/bat-91-dots.json', JSON.stringify({ healer: 'shaman', gear: 'post-BAT-92',
  maintenance: 'periodic healing only; excludes Riptide initial heal, Crit, Unleash, Totems and direct healing', rows, mechanics }, null, 2) + '\n');
console.log(JSON.stringify({ states: rows.length, mechanics }));
