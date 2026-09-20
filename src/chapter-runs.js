import { CONFIG } from './data.js';
import { nodeState, restoreProgress, chapterComplete } from './progression.js';
import { adjustedResource, resourceKey } from './stats.js';

const storageKey = 'vesper-chapter-runs-v1';
const valid = n => Number.isFinite(n) && n >= 0;
export function fullResources(party) {
  const max = party.find(p => p.label === 'HEALER')?.maxMana ?? CONFIG.mana;
  return { health: Object.fromEntries(party.map(p => [resourceKey(p), { current: p.maxHp, max: p.maxHp }])), mana: { current: max, max } };
}
export function reconcileResources(resources, party) {
  const full = fullResources(party);
  const adapt = (old, next, health = false) => old && valid(old.current) && valid(old.max)
    ? { current: health && old.current === 0 ? 0 : adjustedResource(old.current, old.max, next.max), max: next.max } : next;
  return { health: Object.fromEntries(Object.entries(full.health).map(([id, value]) => [id, adapt(resources?.health?.[id], value, true)])), mana: adapt(resources?.mana, full.mana) };
}

// Permanent completion/rewards live elsewhere. This store only owns attempts.
export class ChapterRuns {
  constructor(storage) {
    this.storage = storage; this.runs = {};
    try { const saved = JSON.parse(storage?.getItem(storageKey)); if (saved && typeof saved === 'object' && !Array.isArray(saved)) this.runs = saved; } catch { /* Start clean if the save is unreadable. */ }
    // Reloading an unfinished fight ends that attempt, preventing resource rerolls.
    for (const [id, run] of Object.entries(this.runs)) {
      if (!run || typeof run !== 'object') { delete this.runs[id]; continue; }
      if (run.inEncounter) this.runs[id] = { status: 'failed', completed: [], resources: null, inEncounter: null };
    }
    this.save();
  }
  save() { try { this.storage?.setItem(storageKey, JSON.stringify(this.runs)); } catch { /* Session state remains usable. */ } }
  get(chapter, party) {
    let run = this.runs[chapter.id];
    if (!run) return this.restart(chapter, party);
    run.completed = [...restoreProgress(run.completed, chapter.nodes)];
    if (!['active', 'complete', 'failed'].includes(run.status)) run.status = 'active';
    if (run.status === 'failed') { run.completed = []; run.resources = fullResources(party); }
    else run.resources = reconcileResources(run.resources, party);
    // A saved complete flag is meaningful only with the chapter's required victories.
    if (run.status === 'complete' && !chapterComplete(new Set(run.completed), chapter.nodes)) run.status = 'active';
    this.save(); return run;
  }
  restart(chapter, party) {
    const run = { status: 'active', completed: [], resources: fullResources(party), inEncounter: null };
    this.runs[chapter.id] = run; this.save(); return run;
  }
  begin(chapter, node, party) {
    const run = this.get(chapter, party);
    if (run.status !== 'active' || run.inEncounter || !chapter.nodes.includes(node) || nodeState(node, new Set(run.completed)) !== 'available') return null;
    run.inEncounter = node.id; this.save();
    return structuredClone(run.resources);
  }
  finish(chapter, node, game) {
    const run = this.runs[chapter.id];
    if (!run || run.inEncounter !== node?.id || game.encounter.id !== node.encounter || !['victory', 'defeat'].includes(game.status)) return false;
    if (game.status === 'defeat') { this.fail(chapter, game.partyTemplate); return true; }
    run.resources = game.resources(); run.inEncounter = null;
    run.completed = [...new Set([...run.completed, node.id])];
    run.status = chapterComplete(new Set(run.completed), chapter.nodes) ? 'complete' : 'active';
    this.save(); return true;
  }
  fail(chapter, party) {
    const run = this.restart(chapter, party); run.status = 'failed'; this.save();
  }
}
