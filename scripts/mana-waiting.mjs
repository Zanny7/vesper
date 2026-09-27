// Isolated passive-clear / depleted-Mana probes. Encounter pressure stays fixed.
// node scripts/mana-waiting.mjs [output.json] [samples per path/build/stage]
import { writeFileSync } from 'node:fs';
import { manaFight, manaRoute, combinations, baseline } from './mana-economy.mjs';
import { CHAPTERS, CHAPTER_ENCOUNTERS, GEAR } from '../src/data.js';
import { TALENT_TREES } from '../src/talent-trees.js';
import { routes } from './boss-balance.mjs';
import { chapterBuilds } from './encounter-pressure.mjs';
import { shamanBuilds } from './shaman-policy.mjs';
import { fullResources, recoverEncounterMana } from '../src/chapter-runs.js';

const tuning = JSON.parse(process.env.TUNING || '{"recovery":0.2,"baseRegen":3,"gearScale":1.5}');
const samples = Number(process.argv[3] || 2);
if (!Number.isInteger(samples) || samples < 1 || !combinations.some(c => c.recovery === tuning.recovery && c.baseRegen === tuning.baseRegen && c.gearScale === tuning.gearScale)) throw new Error('Invalid probe arguments');
for (const item of GEAR) if (item.stats.manaRegen != null) item.stats.manaRegen = baseline.itemRegen[item.id];
const rows = [];
let witness;
for (let chapter = 1; chapter <= 4; chapter++) for (const path of routes(CHAPTERS[chapter - 1]).keys())
  for (const build of chapterBuilds[chapter - 1]) for (const stage of ['first', 'ready']) for (let index = 0; index < samples; index++) {
    const route = manaRoute(chapter, path, index, build, stage, 'conservative', tuning);
    if (chapter === 4 && path === 0 && build === '7-earth' && stage === 'ready' && index === 0) witness = route;
    for (const [position, original] of route.encounters.entries()) {
      if (original.boss) continue;
      const actualBuild = { ...shamanBuilds[build] };
      if (stage === 'first' && position === 0) {
        const last = [...TALENT_TREES.shaman].reverse().find(t => actualBuild[t.id]);
        if (last && --actualBuild[last.id] === 0) delete actualBuild[last.id];
      }
      for (const policy of ['idle', 'conservative']) {
        const resources = fullResources(original.entryParty);
        resources.mana.current = resources.mana.max / 2;
        const result = manaFight(CHAPTER_ENCOUNTERS[original.encounter], original.entryParty, actualBuild,
          route.seed + position * 100000, resources, policy);
        const ending = result.won ? recoverEncounterMana(result.resources, tuning.recovery).mana.current : result.exitMana;
        const totalHealth = original.entryParty.reduce((s, p) => s + p.maxHp, 0);
        const { resources: snapshot, ...metrics } = result;
        rows.push({ chapter, path, build, stage, encounter: original.encounter, seed: route.seed,
          combatSeed: route.seed + position * 100000, policy, equipped: original.equipped,
          entryParty: original.entryParty, ...metrics, endingMana: ending, netManaCost: result.entryMana - ending,
          exitHealth: snapshot.health, pressureDefect: result.won && result.deaths === 0
            && (result.casts === 0 || result.casts <= 1 && result.effectiveHealing <= totalHealth * .05) });
      }
    }
  }
// Its zero-heal clear is a pressure defect, not a global Mana-tuning criterion.
const original = witness.encounters[0], baselineGearRegen = original.gearRegen / tuning.gearScale;
const idleMatrix = combinations.map(candidate => {
  const party = original.entryParty.map(p => p.label === 'HEALER'
    ? { ...p, manaRegen: candidate.baseRegen + baselineGearRegen * candidate.gearScale } : p);
  const resources = fullResources(party); resources.mana.current = resources.mana.max / 2;
  const result = manaFight(CHAPTER_ENCOUNTERS[original.encounter], party, shamanBuilds[witness.build], witness.seed, resources, 'idle');
  const ending = result.won ? recoverEncounterMana(result.resources, candidate.recovery).mana.current : result.exitMana;
  const { resources: snapshot, ...metrics } = result;
  return { tuning: candidate, chapter: 4, encounter: original.encounter, seed: witness.seed,
    ...metrics, endingMana: ending, manaGain: ending - result.entryMana };
});
writeFileSync(process.argv[2] || 'docs/bat-93-waiting.json', JSON.stringify({ tuning, samples,
  method: 'Reached normal loadouts from seeded conservation routes; independent full-Health/half-Mana re-entry, not a carried-resource route. Ready is three acquired same-chapter normal reward passes, not overgeared.',
  rows, idleMatrix }, null, 2) + '\n');
console.log(JSON.stringify({ probes: rows.length, idleVictories: rows.filter(r => r.policy === 'idle' && r.won).length,
  safeIdleVictories: rows.filter(r => r.policy === 'idle' && r.pressureDefect).length,
  approvedIdleVictories: idleMatrix.filter(r => r.won).length,
  minimumIdleGain: Math.min(...idleMatrix.map(r => r.manaGain)) }));
