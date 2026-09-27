// Reproducible BAT-89 evidence. node scripts/shaman-revalidation-evidence.mjs [job-name ...]
// Runs independent jobs in three child processes; no production/save mutation.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { builds } from './shaman-balance.mjs';
const caps = '7-earth,7-tide,7-ancestral,7-earth-echo,7-tide-echo,7-ancestral-echo';
const alternatives = '7-high-tide,7-momentum,8-earth,8-tide,8-ancestral,8-earth-echo,8-earth-double,8-earth-tide,8-earth-ancestral,8-ancestral-double';
const refs = '7-fourfold,7-blooming';
const early = '0-base,1-reserves,1-deep,1-momentum,1-binding,1-rejuvenation';
const defaults = '1-reserves,1-binding,1-rejuvenation,3-waves,3-binding,3-rejuvenation,5-flow,5-penance,5-nourishment';
const job = (samples, mode, env) => ({ samples, mode, env });
const jobs = {
  progression: job(30, 'controlled', { SCENARIOS: 'adaptive', CHAPTERS: '1,2,3', BUILD_FILTER: defaults + ',0-base', PROFILES: 'focused,split,three,aoe,burst,long', PRESSURE_SCALE: '1.6' }),
  builds: job(30, 'controlled', { SCENARIOS: 'adaptive', BUILD_FILTER: `${refs},${caps},${alternatives}`, PROFILES: 'focused,split,three,aoe,burst,long,groupBurst', PRESSURE_SCALE: '1.6' }),
  routes: job(30, 'routes', { SCENARIOS: 'before,policy,adaptive', CHAPTERS: '1,2,3,4', BUILD_FILTER: `${defaults},${refs},${caps}`, SKILLS: 'veryGood,average,weak', STAGES: 'first,ready' }),
  early: job(300, 'controlled', { SCENARIOS: 'before,policy,adaptive', CHAPTERS: '1', BUILD_FILTER: early, PROFILES: 'focused,split,three,aoe,burst,long', PRESSURE_SCALE: '2' }),
  earlyRoutes: job(300, 'routes', { SCENARIOS: 'before,policy,adaptive', CHAPTERS: '1', BUILD_FILTER: early, SKILLS: 'veryGood,average,weak', STAGES: 'first,ready' }),
  niches: job(300, 'controlled', { SCENARIOS: 'before,policy,adaptive', BUILD_FILTER: `${refs},7-earth-echo,7-tide-echo,7-ancestral-echo,8-earth-tide,8-earth-ancestral,8-ancestral-double`, PROFILES: 'split,three,aoe', PRESSURE_SCALE: '2.8' }),
  stress: job(300, 'controlled', { SCENARIOS: 'before,policy,adaptive', BUILD_FILTER: `${refs},7-earth-echo,7-tide-echo,7-ancestral-echo,8-earth-tide,8-earth-ancestral,8-ancestral-double`, PROFILES: 'burst,long', PRESSURE_SCALE: '2' }),
  closeRoutes: job(300, 'routes', { SCENARIOS: 'before,policy,adaptive', BUILD_FILTER: `${refs},${caps}`, SKILLS: 'veryGood', STAGES: 'ready' }),
  unleash: job(300, 'controlled', { SCENARIOS: 'adaptive,efficiency,reserve', HEALERS: 'shaman', BUILD_FILTER: '7-earth-echo,7-ancestral-echo,8-earth-double,8-ancestral-double', PROFILES: 'burst,long', PRESSURE_SCALE: '2' }),
  focused: job(300, 'controlled', { SCENARIOS: 'adaptive', BUILD_FILTER: `${refs},7-earth-echo,7-tide-echo,7-ancestral-echo`, PROFILES: 'focused', PRESSURE_SCALE: '2.8' }),
  'earth-four-niches': job(300, 'controlled', { SCENARIOS: 'adaptive', BUILD_FILTER: `${refs},7-earth-echo`, PROFILES: 'focused,split,three,aoe', PRESSURE_SCALE: '2.8', SHAMAN_TUNING: '{"healingWave":{"earthlivingDuration":4}}' }),
  'earth-four-stress': job(300, 'controlled', { SCENARIOS: 'adaptive', BUILD_FILTER: `${refs},7-earth-echo`, PROFILES: 'burst,long', PRESSURE_SCALE: '2', SHAMAN_TUNING: '{"healingWave":{"earthlivingDuration":4}}' }),
  'earth-four-routes': job(300, 'routes', { SCENARIOS: 'adaptive', BUILD_FILTER: `${refs},7-earth-echo`, SKILLS: 'veryGood', STAGES: 'ready', SHAMAN_TUNING: '{"healingWave":{"earthlivingDuration":4}}' }),
  packages: { samples: null, mode: 'deterministic', script: 'shaman-package-probes.mjs', args: [] },
  interactions: { samples: null, mode: 'deterministic', script: 'shaman-interactions.mjs', args: [] },
  reference: { samples: 300, mode: 'reference', script: 'shaman-reference-probes.mjs', args: ['30','300'],
    sideOutput: { name: 'reference-grid', path: 'docs/bat-89-reference-grid.jsonl', samples: 30 } },
  capstones: { samples: 300, mode: 'ablation', script: 'shaman-capstone-probes.mjs', args: ['300'] },
};
const sources = ['src/combat.js','src/data.js','src/stats.js','src/shaman-talents.js','src/talent-trees.js','src/talents.js',
  'src/priest-talents.js','src/druid-talents.js','src/loot.js','scripts/talent-balance.mjs','scripts/boss-balance.mjs',
  'scripts/shaman-balance.mjs','scripts/shaman-policy.mjs','scripts/shaman-priority.mjs','scripts/shaman-revalidation.mjs',
  'scripts/shaman-revalidation-evidence.mjs','scripts/fixtures/bat87-combat.mjs',
  'scripts/shaman-package-probes.mjs','scripts/shaman-interactions.mjs','scripts/shaman-reference-probes.mjs','scripts/shaman-capstone-probes.mjs'];
const selected = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(jobs);
if (selected.some(name => !jobs[name])) throw new Error('Unknown evidence job');
mkdirSync('docs', { recursive: true });
const manifestPath = 'docs/bat-89-evidence-manifest.json';
const previous = (() => { try { return JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { return {}; } })();
const hashes = Object.fromEntries(sources.map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')]));
const manifest = { baseline: 'c33440f (BAT-87 combat fixture; imports redirected only)', step: '1/60 s',
  seeds: { controlled: '87000 + chapter*10000 + index; combat seed +999', routes: '187000 + chapter*100000 + index; unchanged loot/route RNG' },
  assumptions: 'Controlled: identical real Priest-loot-derived stats, infinite boss Health, all five alive at 90s / long 140s. Routes: actual healer loot, live Health/Mana carry; first starts before first point. Before=BAT87/legacy; policy=BAT87/refined; adaptive/efficiency/reserve=current/refined. Build echo labels retain historical names but allocate Cascading Stream in current.',
  allocations: builds, jobs: previous.jobs || {} };
let cursor = 0, failed = false;
async function worker() {
  while (cursor < selected.length) {
    const name = selected[cursor++], config = jobs[name];
    const env = { ...process.env, SCENARIOS: 'adaptive', CHAPTERS: '4', HEALERS: 'priest,druid,shaman',
      SKILLS: 'veryGood,average,weak', STAGES: 'first,ready', SHAMAN_TUNING: '{}', ...config.env };
    const start = Date.now(), output = `docs/bat-89-${name}.jsonl`;
    const args = config.script ? [`scripts/${config.script}`, ...config.args]
      : ['scripts/shaman-revalidation.mjs', String(config.samples), config.mode];
    console.log(`Starting ${name}: ${config.samples ?? 'deterministic'} seeds`);
    let stdout = '', stderr = '';
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, { env, windowsHide: true });
      child.stdout.on('data', data => { stdout += data; });
      child.stderr.on('data', data => { stderr += data; });
      child.on('error', reject); child.on('close', resolve);
    });
    if (code !== 0) { failed = true; console.error(`${name}: ${stderr}`); continue; }
    const rows = stdout.trim().split('\n').map(line => JSON.parse(line));
    if (!rows.length || config.samples!==null && rows.some(row => row.samples !== config.samples)) throw new Error(`Invalid ${name} output`);
    writeFileSync(output, stdout);
    manifest.jobs[name] = { ...config, output, rows: rows.length, durationSeconds: (Date.now() - start) / 1000,
      sources: hashes, sha256: createHash('sha256').update(stdout).digest('hex') };
    if(config.sideOutput) {
      const side = config.sideOutput, content=readFileSync(side.path);
      const sideRows=content.toString('utf8').trim().split('\n').map(line=>JSON.parse(line));
      if(sideRows.some(row=>row.samples!==side.samples)) throw new Error(`Invalid ${side.name} output`);
      manifest.jobs[side.name]={ ...config, samples:side.samples, output:side.path, rows:sideRows.length,
        sources:hashes, sha256:createHash('sha256').update(content).digest('hex') };
    }
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Completed ${name}: ${rows.length} rows in ${manifest.jobs[name].durationSeconds}s`);
  }
}
await Promise.all(Array.from({ length: 3 }, worker));
if (failed) process.exitCode = 1;
