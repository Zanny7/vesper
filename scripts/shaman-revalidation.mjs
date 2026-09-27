// node scripts/shaman-revalidation.mjs [samples=30] [controlled|routes]
// Filters are explicit and recorded. Baseline numbers and policy are frozen.
import { builds, validateBuild, controlledEncounter, equivalentParty, simulate, summary, routeTrial, routeSummary } from './shaman-balance.mjs';
import { decideShaman as legacy } from './shaman-policy.mjs';
import { decideShamanPriority } from './shaman-priority.mjs';
const samples = Number(process.argv[2] || 30), mode = process.argv[3] || 'controlled';
if (!Number.isInteger(samples) || samples < 1) throw new Error('Positive sample count required');
const scenarios = {
  before: { version: 'bat87', policy: legacy },
  policy: { version: 'bat87', policy: decideShamanPriority },
  adaptive: { version: 'current', policy: decideShamanPriority },
  efficiency: { version: 'current', policy: (g, s) => decideShamanPriority(g, s, { unleashMode: 'efficiency' }) },
  reserve: { version: 'current', policy: (g, s) => decideShamanPriority(g, s, { unleashMode: 'reserve' }) },
};
const list = (key, fallback) => (process.env[key] || fallback).split(',');
for (const scenario of list('SCENARIOS', 'before,policy,adaptive,efficiency,reserve')) {
  const options = scenarios[scenario];
  if (!options) throw new Error(`Unknown scenario ${scenario}`);
  for (const chapter of list('CHAPTERS', '4').map(Number)) for (const healer of list('HEALERS', 'priest,druid,shaman')) {
    if (healer !== 'shaman' && scenario !== 'adaptive') continue;
    const names = list('BUILD_FILTER', chapter === 4
      ? '7-fourfold,7-blooming,7-earth,7-tide,7-ancestral,7-earth-echo,7-tide-echo,7-ancestral-wave,8-ancestral-double'
      : '0-base,1-reserves,1-binding,1-rejuvenation,3-waves,3-binding,3-rejuvenation,5-flow,5-penance,5-nourishment');
    for (const name of names.filter(name => builds[healer][name])) {
      const metadata = { version: options.version, points: validateBuild(healer, builds[healer][name]),
        allocation: builds[healer][name], tuning: JSON.parse(process.env.SHAMAN_TUNING || '{}') };
      if (mode === 'controlled') for (const profile of list('PROFILES', 'focused,split,three,aoe,attrition,burst,long,groupBurst')) {
        const scale = Number(process.env.PRESSURE_SCALE || 2);
        const encounter = controlledEncounter(chapter, profile, scale);
        const rows = Array.from({ length: samples }, (_, i) => {
          const seed = 87000 + chapter * 10000 + i;
          return simulate(encounter, equivalentParty(chapter, healer, seed), healer, builds[healer][name], seed + 999, null,
            { ...options, policy: healer === 'shaman' ? options.policy : null, seconds: profile === 'long' ? 140 : 90 });
        });
        console.log(JSON.stringify({ scenario, mode, chapter, healer, build: name, profile, scale, ...metadata, ...summary(rows) }));
      } else if (mode === 'routes') {
        if (!name.startsWith(`${chapter * 2 - 1}-`)) continue;
        for (const skill of list('SKILLS', 'veryGood,average,weak')) for (const stage of list('STAGES', 'first,ready')) {
          const rows = Array.from({ length: samples }, (_, i) => routeTrial(chapter, healer, skill, stage, i, name, options.version,
            { policy: healer === 'shaman' ? options.policy : null }));
          console.log(JSON.stringify({ scenario, mode, chapter, healer, build: name, skill, stage, ...metadata, ...routeSummary(rows) }));
        }
      } else throw new Error(`Unknown mode ${mode}`);
    }
  }
}
