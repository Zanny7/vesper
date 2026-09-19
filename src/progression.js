import { ADVENTURES, CHAPTERS } from './data.js';

export function nodeState(node, completed) {
  if (completed.has(node.id)) return 'completed';
  return node.encounter && (!node.from.length || node.from.some(id => completed.has(id))) ? 'available' : 'locked';
}
export function restoreProgress(saved, nodes = ADVENTURES) {
  const completed = new Set();
  if (!Array.isArray(saved)) return completed;
  // Iterate to support saved IDs and graph declarations in any order.
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) if (saved.includes(node.id) && nodeState(node, completed) === 'available') {
      completed.add(node.id); changed = true;
    }
  }
  return completed;
}
export function chapterComplete(completed, nodes = ADVENTURES) {
  const required = nodes === ADVENTURES ? nodes : nodes.filter(node => node.kind === 'boss');
  return required.length > 0 && required.every(node => completed.has(node.id));
}
export function chapterUnlocked(chapter, completed) {
  const index = CHAPTERS.indexOf(chapter);
  return index === 0 || (index > 0 && chapterComplete(completed, CHAPTERS[index - 1].nodes));
}
export function restoreCampaign(saved) {
  const completed = new Set();
  for (const chapter of CHAPTERS) {
    if (!chapterUnlocked(chapter, completed)) break;
    for (const id of restoreProgress(saved, chapter.nodes)) completed.add(id);
  }
  return completed;
}
export function awardVictory(completed, active, game, nodes = ADVENTURES) {
  const node = nodes.find(node => node.id === active);
  if (!node || game.status !== 'victory' || game.encounter.id !== node.encounter || nodeState(node, completed) !== 'available') return false;
  completed.add(node.id);
  return true;
}
