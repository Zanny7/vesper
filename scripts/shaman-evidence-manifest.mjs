// Detect stale or mixed BAT-87 evidence before generating a balance report.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const root = new URL('../', import.meta.url);
const digest = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex');
export function captureSources() {
  const paths = readdirSync(new URL('src/', root)).filter(p => p.endsWith('.js')).map(p => `src/${p}`);
  paths.push(...['boss-balance.mjs', 'talent-balance.mjs', 'shaman-balance.mjs', 'shaman-policy.mjs', 'shaman-interactions.mjs'].map(p => `scripts/${p}`));
  return Object.fromEntries(paths.sort().map(path => [path, digest(path)]));
}
export function writeManifest(matrixSamples, closeSamples, sourceHashes = captureSources()) {
  if (JSON.stringify(sourceHashes) !== JSON.stringify(captureSources())) throw new Error('Simulation sources changed during generation; rerun evidence');
  const paths = readdirSync(new URL('docs/', root)).filter(p => /^bat-87-.*\.jsonl$/.test(p));
  const evidence = Object.fromEntries(paths.sort().map(path => [`docs/${path}`, digest(`docs/${path}`)]));
  writeFileSync(new URL('docs/bat-87-evidence-manifest.json', root), JSON.stringify({
    generatedAt: new Date().toISOString(), node: process.version, matrixSamples, closeSamples, sourceHashes, evidence,
  }, null, 2) + '\n');
}
export function verifyManifest() {
  const manifest = JSON.parse(readFileSync(new URL('docs/bat-87-evidence-manifest.json', root), 'utf8'));
  for (const [path, expected] of Object.entries({ ...manifest.sourceHashes, ...manifest.evidence })) {
    if (digest(path) !== expected) throw new Error(`Stale BAT-87 evidence: ${path}; rerun shaman-evidence.mjs`);
  }
  return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeManifest(Number(process.argv[2] || 30), Number(process.argv[3] || 300));
}
