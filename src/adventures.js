import { CHAPTERS, CHAPTER_ENCOUNTERS } from './data.js';
import { nodeState, chapterComplete, chapterUnlocked, restoreCampaign, awardVictory } from './progression.js';
export { nodeState, chapterComplete, restoreProgress, awardVictory } from './progression.js';

export function setupAdventures({ startEncounter, onProgress }) {
  const $ = selector => document.querySelector(selector);
  const map = $('#adventure-map'), dialog = $('#encounter-preview');
  // Preserve Chapter I progress when upgrading to the multi-chapter campaign.
  const storageKey = 'vesper-campaign-v3';
  let completed = new Set();
  try { completed = restoreCampaign(JSON.parse(localStorage.getItem(storageKey) ?? localStorage.getItem('vesper-chapter1-v2'))); } catch { /* Session progress works without storage. */ }
  let chapter = CHAPTERS[0], nodes = chapter.nodes;
  let selected;
  let routes = [], buttons = new Map();
  let active = null;
  function buildMap() {
    routeObserver.disconnect();
    selected = nodes.find(node => nodeState(node, completed) === 'available')?.id || nodes.at(-1).id;
    $('#chapter-title').textContent = chapter.name;
    $('#chapter-view .journey-heading .eyebrow').textContent = `${chapter.number.toUpperCase()} · YOUR NEXT VIGIL`;
    $('#chapter-view .journey-intro').textContent = chapter.id === 'catacombs' ? 'Four encounters. One descent. Keep their light alive.' : `${nodes.length} encounters · ${chapter.routeLength} fights along a route · Choose either path at each fork.`;
    map.classList.toggle('branching', chapter.id !== 'catacombs');
    map.classList.toggle('long-route', nodes.length > 6);
    map.closest('.journey').setAttribute('aria-label', `${chapter.number} progression map`);
    map.setAttribute('aria-label', `${chapter.number} encounter routes`);
    routes = nodes.flatMap(node => node.from.map(id => ({ from: id, to: node.id })));
    map.innerHTML = `<svg class="adventure-routes" aria-hidden="true">${routes.map(route => `<path data-route="${route.from}"/>`).join('')}</svg>`;
    buttons = new Map(nodes.map((node, index) => {
      const button = document.createElement('button');
      button.className = `adventure-node ${node.kind}`;
      button.style.setProperty('--x', `${node.x}%`); button.style.setProperty('--y', `${node.y}%`);
      button.innerHTML = `<span class="node-kind">${String(index + 1).padStart(2, '0')} · ${node.kind === 'boss' ? 'CHAPTER BOSS' : 'ENCOUNTER'}</span><span class="node-symbol" aria-hidden="true">${node.kind === 'boss' ? '♜' : '◇'}</span><strong>${node.name}</strong><span class="node-state"></span>`;
      button.addEventListener('click', () => { selected = node.id; render(); });
      map.append(button);
      return [node.id, button];
    }));
    routeObserver.observe(map);
    for (const button of buttons.values()) routeObserver.observe(button);
    render();
  }
  // Measure the actual icon borders so names, font loading, and responsive layouts
  // never move the path endpoints onto the surrounding text.
  function drawRoutes() {
    const bounds = map.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const svg = map.querySelector('svg');
    svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    const vertical = chapter.id === 'catacombs' && matchMedia('(max-width: 600px)').matches;
    routes.forEach((route, index) => {
      const from = buttons.get(route.from), to = buttons.get(route.to);
      const a = from.querySelector('.node-symbol').getBoundingClientRect();
      const b = to.querySelector('.node-symbol').getBoundingClientRect();
      const y1 = a.top + a.height / 2 - bounds.top, y2 = b.top + b.height / 2 - bounds.top;
      let x1 = a.right - bounds.left, x2 = b.left - bounds.left;
      let bend = (x1 + x2) / 2;
      if (vertical) {
        // Sweep beside the labels on the narrow vertical map.
        const left = b.left < a.left;
        x1 = (left ? a.left : a.right) - bounds.left;
        x2 = (left ? b.left : b.right) - bounds.left;
        const ar = from.getBoundingClientRect(), br = to.getBoundingClientRect();
        bend = left ? Math.max(0, Math.min(ar.left, br.left) - bounds.left - 24)
          : Math.min(bounds.width, Math.max(ar.right, br.right) - bounds.left + 24);
      }
      svg.children[index].setAttribute('d', `M ${x1} ${y1} C ${bend} ${y1}, ${bend} ${y2}, ${x2} ${y2}`);
    });
  }
  const routeObserver = new ResizeObserver(drawRoutes);
  function render() {
    for (const node of nodes) {
      const button = buttons.get(node.id), state = nodeState(node, completed);
      button.dataset.state = state;
      button.setAttribute('aria-pressed', String(selected === node.id));
      button.querySelector('.node-state').textContent = state === 'completed' ? '✓ Completed · Replay' : state === 'available' ? chapter.id === 'catacombs' ? '● Current encounter' : '● Available route' : '⊘ Upcoming · Locked';
    }
    for (const path of map.querySelectorAll('[data-route]')) path.classList.toggle('cleared', completed.has(path.dataset.route));
    const node = nodes.find(node => node.id === selected), encounter = CHAPTER_ENCOUNTERS[node.encounter];
    const state = nodeState(node, completed), count = encounter.adds.length;
    $('#journey-progress').textContent = `${nodes.filter(node => completed.has(node.id)).length} / ${nodes.length} encounters cleared${chapterComplete(completed, nodes) ? ' · Chapter complete' : ''}`;
    $('#detail-type').textContent = `${node.kind === 'boss' ? 'Chapter Boss' : 'Encounter'} · ${nodes.indexOf(node) + 1} / ${nodes.length}`;
    $('#detail-title').textContent = node.name;
    $('#detail-description').textContent = node.description;
    $('#detail-enemies').textContent = `${encounter.name}${count ? ` + ${encounter.adds.map((add, i) => add.name || `Pale Archer ${i + 1}`).join(', ')}` : ' · Alone'}`;
    $('#detail-mechanics').innerHTML = `<li><strong>Tank strikes</strong><p>${encounter.strike.damage} damage to Aldric every ${encounter.strike.every}s.</p></li>${encounter.mechanics.map(m => `<li><strong>${m.name}</strong><p>${m.hint}</p></li>`).join('')}${count ? `<li><strong>Supporting enemies</strong><p>${encounter.adds.map(add => `${add.name || 'Pale Archer'} attacks ${add.target === 'tank' ? 'Aldric' : 'random living allies'}.`).join(' ')} Your party focuses the main enemy; the others flee when it falls.</p></li>` : ''}`;
    $('#detail-lesson').textContent = encounter.lesson;
    $('#preview-encounter').disabled = state === 'locked';
    $('#preview-encounter').textContent = state === 'locked' ? 'Encounter locked' : state === 'completed' ? 'Replay encounter →' : 'Prepare encounter →';
    $('#detail-state').textContent = state === 'locked' ? `Complete ${node.from.map(id => nodes.find(item => item.id === id).name).join(' or ')} first.` : state === 'completed' ? 'Completed. You can return for another vigil.' : 'Your next vigil. Select Prepare to confirm.';
  }
  $('#preview-encounter').addEventListener('click', () => {
    const node = nodes.find(item => item.id === selected);
    if (nodeState(node, completed) === 'locked') return;
    $('#preview-title').textContent = node.name; $('#preview-description').textContent = node.description;
    $('#preview-type').textContent = `${node.kind === 'boss' ? 'Chapter Boss' : 'Encounter'} · 5 heroes · Normal`;
    dialog.showModal();
  });
  $('#cancel-preview').addEventListener('click', () => dialog.close());
  $('#start-preview').addEventListener('click', () => {
    const node = nodes.find(item => item.id === selected);
    if (nodeState(node, completed) === 'locked') return;
    active = node.id; dialog.close(); startEncounter(node);
  });
  buildMap(); onProgress(completed);
  return {
    openChapter(next) {
      if (!chapterUnlocked(next, completed)) return false;
      chapter = next; nodes = chapter.nodes; buildMap(); return true;
    },
    recordVictory(game) {
      if (!awardVictory(completed, active, game, nodes)) return;
      try { localStorage.setItem(storageKey, JSON.stringify([...completed])); } catch { /* Keep session progress. */ }
      selected = nodes.find(node => node.from.includes(active) && nodeState(node, completed) === 'available')?.id || active;
      render(); onProgress(completed);
    },
  };
}
