import { CONFIG } from './data.js';
import { nodeState, restoreProgress, chapterComplete } from './progression.js';
import { adjustedResource, resourceKey } from './stats.js';

const storageKey = 'vesper-chapter-runs-v1';
const valid = n => Number.isFinite(n) && n >= 0;
export function encounterState(chapter, run, node) {
  if (!chapter.nodes.includes(node) || !run) return 'locked';
  if (run.status === 'complete') return run.completed.includes(node.id) ? 'completed' : 'locked';
  if (run.status !== 'active' || run.inEncounter) return 'locked';
  return nodeState(node, new Set(run.completed));
}
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
    // An interrupted fight ends the attempt. The next chapter entry starts fresh.
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
    const complete = chapterComplete(new Set(run.completed), chapter.nodes);
    if (run.status === 'failed' || (!complete && !run.resources)) return this.restart(chapter, party);
    // Historical complete saves must stay closed; stale active saves with a boss clear are closed too.
    run.status = complete ? 'complete' : 'active';
    run.resources = reconcileResources(run.resources, party);
    if (run.status === 'active' && !run.inEncounter && !chapter.nodes.some(node => encounterState(chapter, run, node) === 'available')) return this.restart(chapter, party);
    this.save(); return run;
  }
  restart(chapter, party) {
    const run = { status: 'active', completed: [], resources: fullResources(party), inEncounter: null };
    this.runs[chapter.id] = run; this.save(); return run;
  }
  reconcileParty(party) {
    for (const run of Object.values(this.runs)) if (run?.resources && run.status !== 'failed') run.resources = reconcileResources(run.resources, party);
    this.save();
  }
  begin(chapter, node, party) {
    const run = this.get(chapter, party);
    if (encounterState(chapter, run, node) !== 'available') return null;
    run.inEncounter = node.id; this.save();
    return structuredClone(run.resources);
  }
  finish(chapter, node, game) {
    const run = this.runs[chapter.id];
    if (!run || run.inEncounter !== node?.id || game.encounter.id !== node.encounter || !['victory', 'defeat'].includes(game.status)) return false;
    if (game.status === 'defeat') { this.restart(chapter, game.partyTemplate); return true; }
    run.resources = game.resources(); run.inEncounter = null;
    run.completed = [...new Set([...run.completed, node.id])];
    run.status = chapterComplete(new Set(run.completed), chapter.nodes) ? 'complete' : 'active';
    this.save(); return true;
  }
  abandon(chapter) {
    const run = this.runs[chapter.id];
    if (run?.status === 'active' && run.inEncounter) { run.inEncounter = null; this.save(); }
  }
}
