import { healerHint, loadActiveHealer } from './healers.js';
import { CHAPTERS, CHAPTER_ENCOUNTERS } from './data.js';
import { nodeState, chapterComplete, chapterUnlocked, restoreCampaign } from './progression.js';
import { itemIcon } from './equipment.js';
import { mechanicCategory, mechanicIcon } from './mechanic-icons.js';
export { nodeState, chapterComplete, restoreProgress, awardVictory } from './progression.js';

function minimumMapExtent(nodes, axis, nodeSize, spacing) {
  const points = [...new Set(nodes.map(node => node[axis]))].sort((a, b) => a - b);
  if (!points.length) return 0;

  const edgeSpace = nodeSize / 2 + 4;
  let extent = Math.max(
    nodeSize + spacing,
    edgeSpace * 100 / Math.max(points[0], 1),
    edgeSpace * 100 / Math.max(100 - points.at(-1), 1),
  );
  const lanes = axis === 'x'
    ? [nodes]
    : [...new Set(nodes.map(node => node.x))].map(x => nodes.filter(node => node.x === x));
  for (const lane of lanes) {
    const lanePoints = [...new Set(lane.map(node => node[axis]))].sort((a, b) => a - b);
    for (let index = 1; index < lanePoints.length; index++) {
      extent = Math.max(extent, (nodeSize + spacing) * 100 / (lanePoints[index] - lanePoints[index - 1]));
    }
  }
  return Math.ceil(extent);
}

export function setupAdventures({ startEncounter, onProgress, runs, getParty, getNormalLoot, awardLoot, onLoot, onVictory }) {
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
  let runCompleted = new Set();
  const currentRun = () => runs.get(chapter, getParty());
  function restartChapter() {
    runs.restart(chapter, getParty()); active = null; selected = chapter.nodes[0].id; render();
  }
  $('#restart-chapter').addEventListener('click', restartChapter);
  const mechanicsList = $('#detail-mechanics');
  mechanicsList.addEventListener('click', event => {
    const button = event.target.closest('.mechanic-row');
    if (!button || !mechanicsList.contains(button)) return;
    const open = button.getAttribute('aria-expanded') !== 'true';
    mechanicsList.querySelectorAll('.mechanic-row').forEach(row => {
      row.setAttribute('aria-expanded', 'false');
      document.getElementById(row.getAttribute('aria-controls')).hidden = true;
    });
    if (open) {
      button.setAttribute('aria-expanded', 'true');
      document.getElementById(button.getAttribute('aria-controls')).hidden = false;
    }
  });
  function buildMap() {
    routeObserver.disconnect();
    runCompleted = new Set(currentRun().completed);
    selected = nodes.find(node => nodeState(node, runCompleted) === 'available')?.id || nodes.at(-1).id;
    $('#chapter-title').textContent = chapter.name;
    $('#chapter-view .journey-heading .eyebrow').textContent = `${chapter.number.toUpperCase()} · YOUR NEXT VIGIL`;
    $('#chapter-view .journey-intro').textContent = chapter.id === 'catacombs' ? 'Four encounters. One descent. Keep their light alive.' : `${nodes.length} encounters · ${chapter.routeLength} fights along a route · Choose either path at each fork.`;
    map.classList.toggle('branching', chapter.id !== 'catacombs');
    map.style.setProperty('--map-min-width', `${minimumMapExtent(nodes, 'x', 132, 0)}px`);
    map.style.setProperty('--map-min-height', `${minimumMapExtent(nodes, 'y', 160, 16)}px`);
    map.closest('.journey').setAttribute('aria-label', `${chapter.number} progression map`);
    map.setAttribute('aria-label', `${chapter.number} encounter routes`);
    routes = nodes.flatMap(node => node.from.map(id => ({ from: id, to: node.id })));
    map.innerHTML = `<svg class="adventure-routes" aria-hidden="true">${routes.map(route => `<path data-route="${route.from}"/>`).join('')}</svg>`;
    buttons = new Map(nodes.map((node, index) => {
      const button = document.createElement('button');
      button.className = `adventure-node ${node.kind}`;
      button.style.setProperty('--x', `${node.x}%`); button.style.setProperty('--y', `${node.y}%`);
      button.innerHTML = `<span class="node-kind">${String(index + 1).padStart(2, '0')} · ${node.kind === 'boss' ? 'CHAPTER BOSS' : 'ENCOUNTER'}</span><span class="node-symbol" aria-hidden="true">${node.kind === 'boss' ? '♜' : '◇'}</span><strong>${node.name}</strong>`;
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
  function mechanicRow({ id, name, category, description }, index) {
    const descriptionId = `mechanic-description-${index}`;
    return `<li><button type="button" class="mechanic-row" data-mechanic="${id}" aria-expanded="false" aria-controls="${descriptionId}">${mechanicIcon(category)}<span>${name}</span><svg class="mechanic-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button><p class="mechanic-description" id="${descriptionId}" hidden>${description}</p></li>`;
  }
  function render() {
    const run = currentRun(); runCompleted = new Set(run.completed);
    for (const node of nodes) {
      const button = buttons.get(node.id), state = nodeState(node, runCompleted);
      button.dataset.state = state;
      button.setAttribute('aria-pressed', String(selected === node.id));
      button.querySelector('.node-symbol').textContent = state === 'locked' ? '⊘' : node.kind === 'boss' ? '♜' : '◇';
      const stateDescription = state === 'completed' ? 'Cleared this run' : state === 'available' ? chapter.id === 'catacombs' ? 'Current encounter' : 'Available route' : 'Locked';
      button.setAttribute('aria-label', `${node.kind === 'boss' ? 'Chapter boss' : 'Encounter'}: ${node.name}. ${stateDescription}`);
    }
    for (const path of map.querySelectorAll('[data-route]')) path.classList.toggle('cleared', runCompleted.has(path.dataset.route));
    const node = nodes.find(node => node.id === selected), encounter = CHAPTER_ENCOUNTERS[node.encounter];
    const state = nodeState(node, runCompleted), count = encounter.adds.length;
    $('#journey-progress').textContent = `${runCompleted.size} / ${nodes.length} cleared this run${chapterComplete(completed, nodes) ? ' · Previously completed' : ''}`;
    $('#detail-type').textContent = `${node.kind === 'boss' ? 'Chapter Boss' : 'Encounter'} · ${nodes.indexOf(node) + 1} / ${nodes.length}`;
    $('#detail-title').textContent = node.name;
    $('#detail-description').textContent = node.description;
    $('#detail-enemies').textContent = `${encounter.name}${count ? ` + ${encounter.adds.map((add, i) => add.name || `Pale Archer ${i + 1}`).join(', ')}` : ' · Alone'}`;
    const mechanicRows = [
      { id: 'tank-strikes', name: 'Tank strikes', category: 'physical', description: `${encounter.strike.damage} damage to Aldric every ${encounter.strike.every}s.` },
      ...encounter.mechanics.map(mechanic => ({ id: mechanic.id, name: mechanic.name, category: mechanicCategory(mechanic), description: healerHint(mechanic.hint, loadActiveHealer()) })),
      ...(count ? [{ id: 'supporting-enemies', name: 'Supporting enemies', category: 'adds', description: `${encounter.adds.map(add => `${add.name || 'Pale Archer'} attacks ${add.target === 'tank' ? 'Aldric' : 'random living allies'}.`).join(' ')} Your party focuses the main enemy; the others flee when it falls.` }] : []),
    ];
    mechanicsList.innerHTML = mechanicRows.map(mechanicRow).join('');
    $('#detail-lesson').textContent = healerHint(encounter.lesson, loadActiveHealer());
    const loot = getNormalLoot?.(node) || [];
    $('#detail-loot').innerHTML = loot.length
      ? loot.map(item => `<button type="button" class="loot-item gear-slot is-equipped" data-item-id="${item.id}" aria-label="${item.name}, item level ${item.itemLevel}">${itemIcon(item)}</button>`).join('')
      : '<p class="empty-loot">No eligible normal loot remains.</p>';
    $('#preview-encounter').disabled = run.status !== 'active' || state !== 'available';
    $('#preview-encounter').textContent = run.status !== 'active' ? 'Restart chapter to continue' : state === 'locked' ? 'Encounter locked' : state === 'completed' ? 'Cleared this run' : 'Prepare encounter →';
    $('#detail-state').textContent = state === 'locked'
      ? `Complete ${node.from.map(id => nodes.find(item => item.id === id).name).join(' or ')} in this run first.`
      : state === 'completed'
        ? node.kind === 'boss' ? 'Chapter complete. Your party can start the next chapter.' : 'Health and Mana carry into the next encounter. Choose your path.'
        : 'Enter with the resources shown on the map.';
  }
  $('#preview-encounter').addEventListener('click', () => {
    const node = nodes.find(item => item.id === selected);
    if (currentRun().status !== 'active' || nodeState(node, runCompleted) !== 'available') return;
    $('#preview-title').textContent = node.name; $('#preview-description').textContent = node.description;
    $('#preview-type').textContent = `${node.kind === 'boss' ? 'Chapter Boss' : 'Encounter'} · 5 heroes · Normal`;
    dialog.showModal();
  });
  $('#cancel-preview').addEventListener('click', () => dialog.close());
  $('#start-preview').addEventListener('click', () => {
    const node = nodes.find(item => item.id === selected);
    const resources = runs.begin(chapter, node, getParty());
    if (!resources) return;
    active = node.id; dialog.close(); startEncounter(node, resources);
  });
  buildMap(); onProgress(completed);
  return {
    restartChapter,
    refresh: render,
    abandon() { if (active && runs.runs[chapter.id]?.inEncounter) { runs.fail(chapter, getParty()); active = null; selected = nodes[0].id; render(); } },
    openChapter(next) {
      if (!chapterUnlocked(next, completed)) return false;
      chapter = next; nodes = chapter.nodes; buildMap(); return true;
    },
    recordVictory(game) {
      const node = nodes.find(n => n.id === active);
      if (!runs.finish(chapter, node, game)) return;
      if (game.status === 'defeat') { active = null; selected = nodes[0].id; render(); return; }
      onVictory?.(node, chapter);
      onLoot?.(awardLoot?.(node) || []);
      completed.add(node.id);
      try { localStorage.setItem(storageKey, JSON.stringify([...completed])); } catch { /* Keep session progress. */ }
      runCompleted = new Set(currentRun().completed);
      selected = nodes.find(node => node.from.includes(active) && nodeState(node, runCompleted) === 'available')?.id || active;
      render(); onProgress(completed);
    },
  };
}
