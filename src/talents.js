import { CHAPTERS } from './data.js';
import { restoreCampaign } from './progression.js';

export const TALENT_STORAGE_KEY = 'vesper-talents-v1';
export const TALENT_ROW_REQUIREMENTS = Object.freeze([0, 2, 4, 6]);

const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);
const rankCap = talent => talent.maxRank ?? 1;

export function validateTalentTree(tree) {
  const errors = [];
  if (!Array.isArray(tree) || tree.length !== 12) return ['A talent tree must contain exactly 12 talents.'];
  const ids = new Set();
  for (const talent of tree) {
    if (!isRecord(talent) || typeof talent.id !== 'string' || !talent.id) errors.push('Every talent needs an id.');
    else if (ids.has(talent.id)) errors.push(`Duplicate talent id: ${talent.id}.`);
    else ids.add(talent.id);
    if (!Number.isInteger(talent.row) || talent.row < 1 || talent.row > 4) errors.push(`${talent.id || 'Talent'} must use row 1–4.`);
    if (![1, 2].includes(rankCap(talent))) errors.push(`${talent.id || 'Talent'} must have one or two ranks.`);
  }
  for (let row = 1; row <= 4; row++) if (tree.filter(talent => talent?.row === row).length !== 3) errors.push(`Row ${row} must contain exactly three talents.`);
  return errors;
}

const PRIEST_TALENT_ID_MIGRATIONS = Object.freeze({
  'quick-remedy': 'binding-light',
  'measured-casting': 'early-mercy',
  'threefold-penance': 'fourfold-penance',
});
const DRUID_TALENT_ID_MIGRATIONS = Object.freeze({ 'preserved-growth': 'natural-regeneration' });

function cleanHealerState(saved, tree, healerId) {
  const milestones = Array.isArray(saved?.milestones)
    ? [...new Set(saved.milestones.filter(id => typeof id === 'string' && id))]
    : [];
  const talents = new Map((tree || []).map(talent => [talent.id, talent]));
  const allocations = {};
  if (isRecord(saved?.allocations)) {
    const entries = Object.entries(saved.allocations);
    for (const [oldId, rank] of entries) {
      const migrations = healerId === 'priest' ? PRIEST_TALENT_ID_MIGRATIONS : healerId === 'druid' ? DRUID_TALENT_ID_MIGRATIONS : {};
      const id = migrations[oldId] || oldId;
      // A save already using the new identifier takes precedence over its legacy alias.
      if (migrations[oldId] && Object.hasOwn(saved.allocations, id)) continue;
      const talent = talents.get(id);
      if (talent && Number.isInteger(rank) && rank > 0) allocations[id] = Math.min(rank, rankCap(talent));
    }
  }
  // A damaged or older save may claim more ranks than it has earned. Remove the
  // deepest rows first, then later declarations, until the budget is valid.
  const ordered = (tree || []).map((talent, index) => ({ talent, index }))
    .sort((a, b) => b.talent.row - a.talent.row || b.index - a.index);
  let spent = Object.values(allocations).reduce((sum, rank) => sum + rank, 0);
  for (const { talent } of ordered) while (spent > milestones.length && allocations[talent.id]) {
    allocations[talent.id]--; spent--;
    if (!allocations[talent.id]) delete allocations[talent.id];
  }
  for (const { talent } of ordered) if (allocations[talent.id] && spent < TALENT_ROW_REQUIREMENTS[talent.row - 1]) {
    spent -= allocations[talent.id]; delete allocations[talent.id];
  }
  return { milestones, allocations };
}

function milestoneIds(chapter, node) {
  if (!chapter?.id || !Array.isArray(chapter.nodes) || !node || !chapter.nodes.includes(node)) return [];
  const ids = [];
  if (chapter.nodes.find(candidate => !candidate.from?.length) === node) ids.push(`${chapter.id}:first`);
  if (node.kind === 'boss') ids.push(`${chapter.id}:boss`);
  return ids;
}

export class TalentProgression {
  constructor(storage, trees = {}, isCombatActive = () => false) {
    this.storage = storage;
    this.trees = { ...trees };
    this.isCombatActive = isCombatActive;
    this.healers = {};
    this.legacyCampaignReconciled = false;
    for (const [healerId, tree] of Object.entries(this.trees)) {
      const errors = validateTalentTree(tree);
      if (errors.length) throw new TypeError(`Invalid ${healerId} talent tree: ${errors.join(' ')}`);
    }
    try {
      const saved = JSON.parse(storage?.getItem(TALENT_STORAGE_KEY));
      if (isRecord(saved?.healers)) this.healers = saved.healers;
      this.legacyCampaignReconciled = saved?.legacyCampaignReconciled === true;
    } catch { /* Start clean when storage is unavailable or unreadable. */ }
    for (const healerId of new Set([...Object.keys(this.healers), ...Object.keys(this.trees)])) this.healers[healerId] = cleanHealerState(this.healers[healerId], this.trees[healerId], healerId);
    this.save();
  }

  save() {
    try { this.storage?.setItem(TALENT_STORAGE_KEY, JSON.stringify({ version: 1, legacyCampaignReconciled: this.legacyCampaignReconciled, healers: this.healers })); } catch { /* Session progression remains usable. */ }
  }

  ensure(healerId) {
    if (typeof healerId !== 'string' || !healerId) return null;
    if (!this.healers[healerId]) this.healers[healerId] = cleanHealerState(null, this.trees[healerId], healerId);
    return this.healers[healerId];
  }

  state(healerId) {
    const saved = this.ensure(healerId);
    if (!saved) return null;
    const allocations = { ...saved.allocations };
    const spentPoints = Object.values(allocations).reduce((sum, rank) => sum + rank, 0);
    return {
      healerId,
      earnedPoints: saved.milestones.length,
      spentPoints,
      unspentPoints: Math.max(0, saved.milestones.length - spentPoints),
      milestones: [...saved.milestones],
      allocations,
    };
  }

  rowUnlocked(healerId, row) {
    const state = this.state(healerId);
    return Boolean(state) && Number.isInteger(row) && row >= 1 && row <= TALENT_ROW_REQUIREMENTS.length
      && state.spentPoints >= TALENT_ROW_REQUIREMENTS[row - 1];
  }

  awardEncounter(healerId, chapter, node) {
    const saved = this.ensure(healerId);
    if (!saved) return 0;
    const before = saved.milestones.length;
    saved.milestones = [...new Set([...saved.milestones, ...milestoneIds(chapter, node)])];
    if (saved.milestones.length !== before) this.save();
    return saved.milestones.length - before;
  }

  reconcileCampaign(healerId, completed, chapters = CHAPTERS) {
    if (!(completed instanceof Set)) return 0;
    const legitimate = chapters === CHAPTERS ? restoreCampaign([...completed]) : completed;
    let awarded = 0;
    for (const chapter of chapters) for (const node of chapter.nodes) if (legitimate.has(node.id)) awarded += this.awardEncounter(healerId, chapter, node);
    return awarded;
  }

  migrateLegacyCampaign(healerId, completed) {
    if (this.legacyCampaignReconciled) return 0;
    const awarded = this.reconcileCampaign(healerId, completed);
    this.legacyCampaignReconciled = true; this.save();
    return awarded;
  }

  spend(healerId, talentId) {
    if (this.isCombatActive()) return { ok: false, reason: 'Talents cannot be changed during combat.' };
    const tree = this.trees[healerId], talent = tree?.find(candidate => candidate.id === talentId);
    if (!talent) return { ok: false, reason: 'Unknown talent.' };
    const state = this.state(healerId), rank = state.allocations[talentId] || 0;
    if (rank >= rankCap(talent)) return { ok: false, reason: 'Talent is at maximum rank.' };
    if (!state.unspentPoints) return { ok: false, reason: 'No unspent talent points.' };
    if (!this.rowUnlocked(healerId, talent.row)) return { ok: false, reason: `Spend ${TALENT_ROW_REQUIREMENTS[talent.row - 1]} points to unlock row ${talent.row}.` };
    this.healers[healerId].allocations[talentId] = rank + 1; this.save();
    return { ok: true, state: this.state(healerId) };
  }

  refund(healerId, talentId) {
    if (this.isCombatActive()) return { ok: false, reason: 'Talents cannot be changed during combat.' };
    const saved = this.ensure(healerId), tree = this.trees[healerId];
    if (!saved || !tree?.some(talent => talent.id === talentId) || !saved.allocations[talentId]) return { ok: false, reason: 'Talent has no points to refund.' };
    const next = { ...saved.allocations, [talentId]: saved.allocations[talentId] - 1 };
    if (!next[talentId]) delete next[talentId];
    const spent = Object.values(next).reduce((sum, rank) => sum + rank, 0);
    const invalid = tree.some(talent => next[talent.id] && spent < TALENT_ROW_REQUIREMENTS[talent.row - 1]);
    if (invalid) return { ok: false, reason: 'Refund points from locked rows first.' };
    saved.allocations = next; this.save();
    return { ok: true, state: this.state(healerId) };
  }

  respec(healerId) {
    if (this.isCombatActive()) return { ok: false, reason: 'Talents cannot be changed during combat.' };
    const saved = this.ensure(healerId);
    if (!saved) return { ok: false, reason: 'Unknown healer.' };
    saved.allocations = {}; this.save();
    return { ok: true, state: this.state(healerId) };
  }
}
