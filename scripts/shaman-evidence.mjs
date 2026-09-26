// Reproduce BAT-87 with real Combat. Defaults: 30 matrix / 300 close seeds.
// node scripts/shaman-evidence.mjs [matrixSamples=30] [closeSamples=300]
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { captureSources, writeManifest } from './shaman-evidence-manifest.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const matrix = Number(process.argv[2] || 30), close = Number(process.argv[3] || 300);
const sourceHashes = captureSources();
if (![matrix, close].every(n => Number.isInteger(n) && n > 0)) throw new Error('Positive integer samples required');
const baseEnv = { ...process.env, CHAPTERS: '', HEALERS: '', SKILLS: '', STAGES: '', PROFILES: '',
  BUILD_FILTER: '', BALANCE_VERSION: 'current', SHAMAN_TUNING: '{}', PRESSURE_SCALE: '1.6' };
const jobs = [];
const add = (name, samples, mode, env = {}, script = 'shaman-balance.mjs') => jobs.push({ name, args: [`scripts/${script}`, String(samples), mode], env });
for (const [prefix, version] of [['before', 'original'], ['after', 'current']]) {
  add(`${prefix}-controlled`, matrix, 'controlled', { BALANCE_VERSION: version });
  add(`${prefix}-routes`, matrix, 'routes', { BALANCE_VERSION: version });
}
add('talent-marginals', matrix, 'marginal', { CHAPTERS: '4', PRESSURE_SCALE: '2' });
add('interactions', matrix, 'controlled', {}, 'shaman-interactions.mjs');
const comparisonBuilds = '7-fourfold,7-blooming,7-earth,7-tide,7-ancestral,7-earth-echo,7-tide-echo,7-ancestral-echo,7-ancestral-wave,8-earth,8-earth-tide,8-earth-ancestral,8-earth-echo,8-ancestral-double,8-tide,8-ancestral';
for (const [prefix, version] of [['close-before', 'original'], ['close', 'current']]) {
  add(`${prefix}-controlled`, close, 'controlled', { CHAPTERS: '4', PRESSURE_SCALE: '2', PROFILES: 'burst,long', BUILD_FILTER: comparisonBuilds, BALANCE_VERSION: version });
  add(`${prefix}-routes`, close, 'routes', { CHAPTERS: '1,4', SKILLS: 'veryGood', STAGES: 'first,ready', BALANCE_VERSION: version });
  add(`${prefix}-alternatives`, close, 'routes', { CHAPTERS: '4', SKILLS: 'veryGood', STAGES: 'ready',
    BUILD_FILTER: '7-fourfold,7-sanctuary,7-fervor,7-blooming,7-genesis,7-tranquility,7-earth,7-tide,7-ancestral,7-earth-echo,7-tide-echo,7-ancestral-echo,7-ancestral-wave', BALANCE_VERSION: version });
}
add('capstones-controlled', close, 'controlled', { CHAPTERS: '4', HEALERS: 'priest,druid', PRESSURE_SCALE: '2', PROFILES: 'burst,long', BUILD_FILTER: '8-twin,8-sanctuary,8-fervor,8-genesis,8-tranquility' });
add('niches-controlled', close, 'controlled', { CHAPTERS: '4', PRESSURE_SCALE: '2.8', PROFILES: 'split,three,aoe',
  BUILD_FILTER: '7-fourfold,7-blooming,7-earth,7-tide,7-ancestral,7-earth-echo,7-tide-echo,7-ancestral-echo,7-ancestral-wave' });
add('group-rank-marginals', close, 'marginal', { CHAPTERS: '4', HEALERS: 'shaman', PRESSURE_SCALE: '3.2', PROFILES: 'groupBurst',
  BUILD_FILTER: '7-flow,7-high-tide,7-stream,7-double' });
await mkdir(new URL('../.tmp/', import.meta.url), { recursive: true });
async function run(job) {
  const name = `bat-87-${job.name}.jsonl`, temporary = new URL(`../.tmp/${process.pid}-${name}`, import.meta.url);
  const output = createWriteStream(temporary, { encoding: 'utf8' });
  const child = spawn(process.execPath, job.args, { cwd: root, env: { ...baseEnv, ...job.env }, windowsHide: true, stdio: ['ignore', 'pipe', 'inherit'] });
  child.stdout.pipe(output);
  const [code] = await Promise.all([
    new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); }),
    new Promise((resolve, reject) => { output.once('finish', resolve); output.once('error', reject); }),
  ]);
  if (code !== 0) throw new Error(`${job.name} failed (${code}); previous evidence preserved`);
  if (!(await stat(temporary)).size) throw new Error(`${job.name} produced no rows; previous evidence preserved`);
  await rename(temporary, new URL(`../docs/${name}`, import.meta.url));
  console.log(`Generated ${name}`);
}
// Two independent workers keep the matrix practical without saturating the PC.
await Promise.all(Array.from({ length: 2 }, async () => {
  while (jobs.length) await run(jobs.shift());
}));
writeManifest(matrix, close, sourceHashes);
