import { ADVENTURES } from './data.js';

export function nodeState(node, completed) {
  if (completed.has(node.id)) return 'completed';
  return node.encounter && (!node.from.length || node.from.some(id => completed.has(id))) ? 'available' : 'locked';
}

export function setupAdventures({ startEncounter }) {
  const map = document.querySelector('#adventure-map');
  const dialog = document.querySelector('#encounter-preview');
  const storageKey = 'vesper-adventures-v1';
  let completed = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved)) completed = new Set(saved.filter(id => ADVENTURES.some(node => node.id === id && node.encounter)));
  } catch { /* Progress remains usable in memory when storage is unavailable. */ }
  let selected = null;
  let active = null;
  const paths = (vertical = false) => ADVENTURES.flatMap(node => node.from.map(id => {
    const parent = ADVENTURES.find(item => item.id === id);
    if (vertical) return `<path d="M ${parent.y} ${parent.x} C ${parent.y} ${(parent.x + node.x) / 2}, ${node.y} ${(parent.x + node.x) / 2}, ${node.y} ${node.x}"/>`;
    return `<path d="M ${parent.x} ${parent.y} C ${(parent.x + node.x) / 2} ${parent.y}, ${(parent.x + node.x) / 2} ${node.y}, ${node.x} ${node.y}"/>`;
  })).join('');
  map.innerHTML = `<svg class="adventure-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${paths()}</svg><svg class="adventure-routes vertical" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${paths(true)}</svg>`;
  const buttons = new Map(ADVENTURES.map(node => {
    const button = document.createElement('button');
    button.className = `adventure-node ${node.kind}`;
    button.style.setProperty('--x', `${node.x}%`);
    button.style.setProperty('--y', `${node.y}%`);
    button.innerHTML = `<span class="node-symbol" aria-hidden="true">${node.kind === 'boss' ? '♜' : '◇'}</span><span class="node-kind">${node.from.length ? '' : 'START HERE · '}${node.kind === 'boss' ? 'BOSS' : 'ENCOUNTER'}</span><strong>${node.name}</strong><span class="node-state"></span>`;
    button.addEventListener('click', () => {
      if (nodeState(node, completed) === 'locked') return;
      selected = node.id;
      render();
      document.querySelector('#preview-title').textContent = node.name;
      document.querySelector('#preview-description').textContent = node.description;
      document.querySelector('#preview-type').textContent = `${node.kind === 'boss' ? 'Boss' : 'Encounter'} · 5 heroes · Normal`;
      dialog.showModal();
    });
    map.append(button);
    return [node.id, button];
  }));
  function render() {
    for (const node of ADVENTURES) {
      const button = buttons.get(node.id);
      const state = nodeState(node, completed);
      button.dataset.state = state;
      button.setAttribute('aria-disabled', String(state === 'locked'));
      button.setAttribute('aria-pressed', String(selected === node.id));
      const label = state === 'completed' ? '✓ Completed · Replay' : state === 'available' ? 'Available' : node.encounter ? 'Locked · Complete a preceding encounter' : 'Locked · Coming soon';
      button.querySelector('.node-state').textContent = selected === node.id ? `Selected · ${label}` : label;
      button.title = `${node.description} ${label}`;
    }
    document.querySelector('#journey-progress').textContent = `${completed.size} / ${ADVENTURES.filter(node => node.encounter).length} released encounters completed`;
  }
  document.querySelector('#cancel-preview').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    selected = null;
    render();
  });
  document.querySelector('#start-preview').addEventListener('click', () => {
    const node = ADVENTURES.find(item => item.id === selected);
    if (!node || nodeState(node, completed) === 'locked') return;
    active = node.id;
    dialog.close();
    startEncounter(node);
  });
  render();
  return {
    recordVictory() {
      if (!active || completed.has(active)) return;
      completed.add(active);
      try { localStorage.setItem(storageKey, JSON.stringify([...completed])); } catch { /* Keep session progress. */ }
      render();
    },
  };
}
