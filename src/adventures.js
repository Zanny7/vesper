import { healerHint, loadActiveHealer } from './healers.js';
import { CHAPTERS, CHAPTER_ENCOUNTERS, CONFIG } from './data.js';
import { chapterComplete, chapterUnlocked, restoreCampaign } from './progression.js';
import { encounterState } from './chapter-runs.js';
import { chapterSwitchCopy, createChapterSwitch } from './chapter-switch.js';
import { encounterLootMarkup } from './loot-presentation.js';
import { mechanicCategory, mechanicIcon } from './mechanic-icons.js';
import { formatCombatNumber } from './stats.js';
import { eraForChapter } from './eras.js';
export { nodeState, chapterComplete, restoreProgress, awardVictory } from './progression.js';
const nodeLabel = node => ({ boss: 'Chapter Boss', elite: 'Optional Elite', shrine: 'Shrine' }[node.kind] || 'Encounter');
const nodeSymbol = node => ({ boss: '♜', elite: '⚔', shrine: '✧' }[node.kind] || '◇');

export function chapterManaText(run) {
  // Unstarted previews have no persisted chapter resource state to display.
  if (run.status === 'pending' || run.status === 'complete' && !run.completed.length) return '';
  return `Mana ${formatCombatNumber(run.resources.mana.current)} / ${formatCombatNumber(run.resources.mana.max)}`;
}

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

export function setupAdventures({ startEncounter, onProgress, onRunChange, runs, getParty, getNormalLoot, getBossBonusLoot, awardLoot, onLoot, onVictory }) {
  const $ = selector => document.querySelector(selector);
  const map = $('#adventure-map'), dialog = $('#encounter-preview'), switchDialog = $('#switch-chapter-run');
  // Preserve Chapter I progress when upgrading to the multi-chapter campaign.
  const storageKey = 'vesper-campaign-v3';
  let completed = new Set();
  try { completed = restoreCampaign(JSON.parse(localStorage.getItem(storageKey) ?? localStorage.getItem('vesper-chapter1-v2'))); } catch { /* Session progress works without storage. */ }
  let chapter = CHAPTERS[0], nodes = chapter.nodes;
  let selected;
  let routes = [], buttons = new Map();
  let active = null;
  let runCompleted = new Set();
  const mobileMap = matchMedia('(max-width: 600px)');
  function sizeMap() {
    const vertical = mobileMap.matches && chapter.id !== 'catacombs';
    map.style.setProperty('--map-min-width', `${minimumMapExtent(nodes, vertical ? 'y' : 'x', vertical ? 96 : 132, 0)}px`);
    map.style.setProperty('--map-min-height', `${minimumMapExtent(nodes, vertical ? 'x' : 'y', 160, 16)}px`);
  }
  mobileMap.addEventListener('change', () => { sizeMap(); requestAnimationFrame(drawRoutes); });
  const currentRun = () => runs.get(chapter, getParty(), chapterComplete(completed, nodes));
  const chapterSwitch = createChapterSwitch({ runs, getParty, onStart: () => {
    active = null; selected = nodes[0].id; render(); onRunChange?.(completed);
  }, confirm: ({ current, next }) => {
    const copy = chapterSwitchCopy(current, next);
    $('#switch-run-title').textContent = copy.title;
    $('#switch-run-loss').textContent = copy.loss;
    $('#switch-run-retained').textContent = copy.retained;
    switchDialog.showModal();
  } });
  function restartChapter() {
    chapterSwitch.request(chapter);
  }
  $('#restart-chapter').addEventListener('click', restartChapter);
  $('#cancel-switch-run').addEventListener('click', () => switchDialog.close());
  switchDialog.addEventListener('close', () => chapterSwitch.cancel());
  $('#confirm-switch-run').addEventListener('click', () => {
    chapterSwitch.accept();
    switchDialog.close();
  });
  const mechanicsList = $('#detail-mechanics');
  const detailLoot = $('#detail-loot');
  detailLoot.addEventListener('click', event => {
    const button = event.target.closest('.boss-bonus-reward');
    if (!button) return;
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('pointerdown', event => {
    if (detailLoot.contains(event.target)) return;
    detailLoot.querySelectorAll('.boss-bonus-reward[aria-expanded="true"]').forEach(button => {
      button.setAttribute('aria-expanded', 'false');
    });
  });
  detailLoot.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const button = event.target.closest('.boss-bonus-reward[aria-expanded="true"]');
    if (!button) return;
    button.setAttribute('aria-expanded', 'false');
  });
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
    const run = currentRun();
    runCompleted = new Set(run.completed);
    selected = nodes.find(node => encounterState(chapter, run, node) === 'available')?.id || (run.status === 'pending' ? nodes[0].id : nodes.at(-1).id);
    $('#chapter-title').textContent = chapter.name;
    $('#chapter-view .journey-heading .eyebrow').textContent = `${eraForChapter(chapter).name.toUpperCase()} · ${chapter.number.toUpperCase()} · YOUR NEXT VIGIL`;
    $('#chapter-view .journey-intro').textContent = chapter.id === 'catacombs' ? 'Four encounters. One descent. Keep their light alive.' : `${nodes.length} nodes · ${chapter.routeLength} stops along a route · Choose your path at each fork.`;
    map.classList.toggle('branching', chapter.id !== 'catacombs');
    sizeMap();
    map.closest('.map-scroll').scrollTo(0, 0);
    map.closest('.journey').setAttribute('aria-label', `${chapter.number} progression map`);
    map.setAttribute('aria-label', `${chapter.number} encounter routes`);
    routes = nodes.flatMap(node => node.from.map(id => ({ from: id, to: node.id })));
    map.innerHTML = `<svg class="adventure-routes" aria-hidden="true">${routes.map(route => `<path data-route="${route.from}"/>`).join('')}</svg>`;
    buttons = new Map(nodes.map((node, index) => {
      const button = document.createElement('button');
      button.className = `adventure-node ${node.kind}`;
      button.style.setProperty('--x', `${node.x}%`); button.style.setProperty('--y', `${node.y}%`);
      button.innerHTML = `<span class="node-kind">${String(index + 1).padStart(2, '0')} · ${nodeLabel(node).toUpperCase()}</span><span class="node-symbol" aria-hidden="true">${nodeSymbol(node)}</span><strong>${node.name}</strong>`;
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
    const vertical = mobileMap.matches;
    routes.forEach((route, index) => {
      const from = buttons.get(route.from), to = buttons.get(route.to);
      const a = from.querySelector('.node-symbol').getBoundingClientRect();
      const b = to.querySelector('.node-symbol').getBoundingClientRect();
      if (vertical && chapter.id !== 'catacombs') {
        const x1 = a.left + a.width / 2 - bounds.left, x2 = b.left + b.width / 2 - bounds.left;
        const y1 = a.bottom - bounds.top, y2 = b.top - bounds.top, bend = (y1 + y2) / 2;
        svg.children[index].setAttribute('d', `M ${x1} ${y1} C ${x1} ${bend}, ${x2} ${bend}, ${x2} ${y2}`);
        return;
      }
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
    const mana = $('#chapter-mana');
    mana.textContent = chapterManaText(run); mana.hidden = !mana.textContent;
    for (const node of nodes) {
      const button = buttons.get(node.id), state = encounterState(chapter, run, node);
      button.dataset.state = state;
      button.setAttribute('aria-pressed', String(selected === node.id));
      button.querySelector('.node-symbol').textContent = state === 'locked' ? '⊘' : nodeSymbol(node);
      const stateDescription = state === 'completed' ? 'Cleared this run' : state === 'available' ? chapter.id === 'catacombs' ? 'Current encounter' : 'Available route' : 'Locked';
      button.setAttribute('aria-label', `${nodeLabel(node)}: ${node.name}. ${stateDescription}`);
    }
    for (const path of map.querySelectorAll('[data-route]')) path.classList.toggle('cleared', runCompleted.has(path.dataset.route));
    const node = nodes.find(node => node.id === selected), encounter = CHAPTER_ENCOUNTERS[node.encounter] || {
      name: 'Quiet sanctuary', adds: [], mechanics: [], lesson: 'Choose shelter before the next encounter. This route forgoes combat rewards.',
    };
    const state = encounterState(chapter, run, node), count = encounter.adds.length;
    $('#restart-chapter').textContent = run.status === 'complete' ? 'Replay Chapter' : run.status === 'pending' ? 'Start Chapter' : 'Restart chapter';
    $('#journey-progress').textContent = run.status === 'pending' ? 'No run started' : run.status === 'complete' && !runCompleted.size ? 'Chapter completed · No active run' : `${runCompleted.size} / ${nodes.length} cleared this run${chapterComplete(completed, nodes) ? ' · Previously completed' : ''}`;
    $('#detail-type').textContent = `${nodeLabel(node)} · ${nodes.indexOf(node) + 1} / ${nodes.length}`;
    $('#detail-title').textContent = node.name;
    $('#detail-description').textContent = node.description;
    $('#detail-enemies').textContent = !node.encounter ? 'Sanctuary · No combat' : `${encounter.name}${count ? ` + ${encounter.adds.map((add, i) => add.name || `Pale Archer ${i + 1}`).join(', ')}` : ' · Alone'}`;
    const mechanicRows = [
      ...(encounter.strike ? [{ id: 'tank-strikes', name: 'Tank strikes', category: 'physical', description: `${encounter.strike.damage} damage to Aldric every ${encounter.strike.every}s.` }] : []),
      ...encounter.mechanics.map(mechanic => ({ id: mechanic.id, name: mechanic.name, category: mechanicCategory(mechanic), description: healerHint(mechanic.hint, loadActiveHealer())
        + (mechanic.startsAt != null ? ` First at ${mechanic.first}s; repeats every ${mechanic.every}s${mechanic.end != null ? ` until ${mechanic.end}s` : ''}.` : '') })),
      ...(encounter.phases || []).map((phase, index) => ({ id: `phase-${index}`, name: `${phase.name} · ${phase.at}s`, category: 'aoe', description: phase.hint })),
      ...(count ? [{ id: 'supporting-enemies', name: 'Supporting enemies', category: 'adds', description: `${encounter.adds.map(add => `${add.name || 'Pale Archer'} attacks ${add.target === 'tank' ? 'Aldric' : 'random living allies'}.`).join(' ')} Your party focuses the main enemy; the others flee when it falls.` }] : []),
    ];
    mechanicsList.innerHTML = mechanicRows.map(mechanicRow).join('');
    $('#detail-lesson').textContent = healerHint(encounter.lesson, loadActiveHealer());
    const loot = getNormalLoot?.(node) || [];
    $('#detail-loot').innerHTML = !node.encounter ? '<p class="empty-loot">No gear rewards at this sanctuary.</p>'
      : chapter.rewardsStatus === 'pending' && !loot.length ? '<p class="empty-loot">Era II gear rewards are not available yet.</p>'
      : encounterLootMarkup(loot, getBossBonusLoot?.(node) || [], node.kind === 'boss', node.kind === 'elite');
    $('#preview-encounter').disabled = state !== 'available';
    $('#preview-encounter').textContent = run.status === 'complete' ? 'Replay Chapter to begin' : run.status === 'pending' ? 'Start Chapter to begin' : state === 'locked' ? 'Route locked' : state === 'completed' ? 'Cleared this run' : !node.encounter ? 'Visit shrine →' : 'Prepare encounter →';
    $('#detail-state').textContent = run.status === 'complete' ? 'Chapter complete. Choose Replay Chapter to begin a new run from the start.' : run.status === 'pending' ? 'Choose Start Chapter to begin a fresh run from this chapter’s first encounter.' : state === 'locked'
      ? chapter.routeChoices === 'exclusive' && nodes.some(other => other.routeStage === node.routeStage && runCompleted.has(other.id))
        ? 'Another path was chosen at this fork. Replay the chapter to try this route.'
        : `Complete ${node.from.map(id => nodes.find(item => item.id === id).name).join(' or ')} in this run first.`
      : state === 'completed'
        ? node.kind === 'boss' ? 'Chapter complete. Your party can start the next chapter.' : !node.encounter ? 'Shrine used this run. Mana is unchanged; choose the next encounter.' : `Health and Mana carry forward; victory restores ${Math.round(CONFIG.encounterManaRecovery * 100)}% of maximum Mana. Choose your path.`
        : !node.encounter ? 'Visit once this run. Health recovery only; Mana stays unchanged.'
        : `Surviving Health and Mana carry forward. Successful non-final encounters restore ${Math.round(CONFIG.encounterManaRecovery * 100)}% of maximum Mana.`;
  }
  function persistProgress(node) {
    completed.add(node.id);
    try { localStorage.setItem(storageKey, JSON.stringify([...completed])); } catch { /* Keep session progress. */ }
    selected = nodes.find(next => next.from.includes(node.id) && encounterState(chapter, currentRun(), next) === 'available')?.id || node.id;
    render(); onProgress(completed);
  }
  $('#preview-encounter').addEventListener('click', () => {
    const node = nodes.find(item => item.id === selected);
    if (encounterState(chapter, currentRun(), node) !== 'available') return;
    if (!node.encounter) {
      if (runs.visit(chapter, node, getParty(), chapterComplete(completed, nodes))) persistProgress(node);
      return;
    }
    $('#preview-title').textContent = node.name; $('#preview-description').textContent = node.description;
    $('#preview-type').textContent = `${nodeLabel(node)} · 5 heroes`;
    dialog.showModal();
  });
  $('#cancel-preview').addEventListener('click', () => dialog.close());
  $('#start-preview').addEventListener('click', () => {
    const node = nodes.find(item => item.id === selected);
    const resources = runs.begin(chapter, node, getParty(), chapterComplete(completed, nodes));
    if (!resources) return;
    active = node.id; dialog.close(); startEncounter(node, resources);
  });
  buildMap(); onProgress(completed);
  return {
    restartChapter,
    refresh: render,
    abandon() { if (active && runs.runs[chapter.id]?.inEncounter) { runs.abandon(chapter); active = null; render(); } },
    openChapter(next) {
      if (!chapterUnlocked(next, completed)) return false;
      chapter = next; nodes = chapter.nodes; buildMap(); return true;
    },
    recordVictory(game) {
      const node = nodes.find(n => n.id === active);
      if (!runs.finish(chapter, node, game)) return false;
      if (game.status === 'defeat') { active = null; selected = nodes[0].id; render(); return true; }
      onVictory?.(node, chapter);
      onLoot?.(awardLoot?.(node, `${runs.runs[chapter.id].attemptId}:${node.id}`) || []);
      persistProgress(node); return true;
    },
  };
}
