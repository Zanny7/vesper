import { CHAPTERS, CONFIG } from './data.js';
import { nodeState, restoreProgress, chapterComplete, awardVisit } from './progression.js';
import { adjustedResource, resourceKey } from './stats.js';

const storageKey = 'vesper-chapter-runs-v1';
const valid = n => Number.isFinite(n) && n >= 0;
// Recovery is awarded once by finish(), using the victory loadout's maximum.
// Health, fallen allies, and the Mana spent in combat are unaffected.
export function recoverEncounterMana(resources, fraction = CONFIG.encounterManaRecovery) {
  const next = structuredClone(resources);
  next.mana.current = Math.min(next.mana.max, next.mana.current + next.mana.max * fraction);
  return next;
}
// Authored shrines restore living allies only and never grant combat Mana recovery.
export function applyNodeUtility(resources, utility) {
  const next = structuredClone(resources);
  if (utility?.type === 'health') for (const health of Object.values(next.health)) {
    if (health.current > 0) health.current = Math.min(health.max, health.current + health.max * utility.fraction);
  }
  return next;
}
export function encounterState(chapter, run, node) {
  if (!chapter.nodes.includes(node) || !run) return 'locked';
  if (run.status === 'complete') return run.completed.includes(node.id) ? 'completed' : 'locked';
  if (run.status !== 'active' || run.inEncounter) return 'locked';
  if (!run.completed.includes(node.id) && chapter.routeChoices === 'exclusive'
    && chapter.nodes.some(other => other.routeStage === node.routeStage && run.completed.includes(other.id))) return 'locked';
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
      const chapter = CHAPTERS.find(candidate => candidate.id === id);
      if (!chapter || !run || typeof run !== 'object' || run.inEncounter || run.status === 'failed') { delete this.runs[id]; continue; }
      run.attemptId ||= crypto.randomUUID();
      run.completed = [...restoreProgress(run.completed, chapter.nodes)];
      run.status = chapterComplete(new Set(run.completed), chapter.nodes) ? 'complete' : 'active';
      if (run.status === 'active' && !run.resources) delete this.runs[id];
    }
    // Legacy saves could hold several active runs. Keep the most advanced one;
    // ties go to the earlier chapter. Other attempts are discarded, never rewards.
    const active = CHAPTERS.filter(chapter => this.runs[chapter.id]?.status === 'active');
    active.sort((a, b) => this.runs[b.id].completed.length - this.runs[a.id].completed.length || CHAPTERS.indexOf(a) - CHAPTERS.indexOf(b));
    for (const chapter of active.slice(1)) delete this.runs[chapter.id];
    this.save();
  }
  save() { try { this.storage?.setItem(storageKey, JSON.stringify(this.runs)); } catch { /* Session state remains usable. */ } }
  activeChapter() { return CHAPTERS.find(chapter => this.runs[chapter.id]?.status === 'active') || null; }
  get(chapter, party, historicallyComplete = false) {
    let run = this.runs[chapter.id];
    if (!run) {
      if (historicallyComplete) return { status: 'complete', completed: [], resources: fullResources(party), inEncounter: null };
      return this.activeChapter() ? { status: 'pending', completed: [], resources: fullResources(party), inEncounter: null } : this.restart(chapter, party);
    }
    run.completed = [...restoreProgress(run.completed, chapter.nodes)];
    const complete = chapterComplete(new Set(run.completed), chapter.nodes);
    if (run.status === 'failed' || (!complete && !run.resources)) { delete this.runs[chapter.id]; this.save(); return this.get(chapter, party, historicallyComplete); }
    // Historical complete saves must stay closed; stale active saves with a boss clear are closed too.
    run.status = complete ? 'complete' : 'active';
    run.resources = reconcileResources(run.resources, party);
    if (run.status === 'active' && !run.inEncounter && !chapter.nodes.some(node => encounterState(chapter, run, node) === 'available')) { delete this.runs[chapter.id]; this.save(); return this.get(chapter, party, historicallyComplete); }
    this.save(); return run;
  }
  restart(chapter, party) {
    for (const other of CHAPTERS) if (other.id !== chapter.id && this.runs[other.id]?.status === 'active') delete this.runs[other.id];
    const run = { status: 'active', completed: [], resources: fullResources(party), inEncounter: null, attemptId: crypto.randomUUID() };
    this.runs[chapter.id] = run; this.save(); return run;
  }
  reconcileParty(party) {
    for (const run of Object.values(this.runs)) if (run?.resources && run.status !== 'failed') run.resources = reconcileResources(run.resources, party);
    this.save();
  }
  begin(chapter, node, party, historicallyComplete = false) {
    const run = this.get(chapter, party, historicallyComplete);
    if (!node.encounter || encounterState(chapter, run, node) !== 'available') return null;
    run.inEncounter = node.id; this.save();
    return structuredClone(run.resources);
  }
  visit(chapter, node, party, historicallyComplete = false) {
    const run = this.get(chapter, party, historicallyComplete);
    const completed = new Set(run.completed);
    if (encounterState(chapter, run, node) !== 'available' || !awardVisit(completed, node, chapter.nodes)) return false;
    run.resources = applyNodeUtility(run.resources, node.utility);
    run.completed = [...completed];
    this.save(); return true;
  }
  finish(chapter, node, game) {
    const run = this.runs[chapter.id];
    if (!run || run.inEncounter !== node?.id || game.encounter.id !== node.encounter || !['victory', 'defeat'].includes(game.status)) return false;
    if (game.status === 'defeat') { this.restart(chapter, game.partyTemplate); return true; }
    run.resources = game.resources(); run.inEncounter = null;
    run.completed = [...new Set([...run.completed, node.id])];
    run.status = chapterComplete(new Set(run.completed), chapter.nodes) ? 'complete' : 'active';
    if (run.status === 'active') run.resources = recoverEncounterMana(run.resources);
    this.save(); return true;
  }
  abandon(chapter) {
    const run = this.runs[chapter.id];
    if (run?.status === 'active' && run.inEncounter) { run.inEncounter = null; this.save(); }
  }
}
