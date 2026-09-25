import { activeHealer } from './healers.js';
import { abilityIcon } from './ability-icons.js';
import { bindingFromEvent } from './ability-settings.js';
import { abilityTooltip } from './ability-presentation.js';
import { Combat } from './combat.js';

export function setupTeamAbilities({ settings, onChange, getLoadout }) {
  const root = document.querySelector('#team-ability-bars');
  const status = document.querySelector('#ability-settings-status');
  const dialog = document.querySelector('#ability-config');
  const title = document.querySelector('#ability-config-title');
  const feedback = document.querySelector('#ability-bind-feedback');
  const left = document.querySelector('#ability-move-left'), right = document.querySelector('#ability-move-right');
  let healerId, configuring = null, drag = null, suppressClick = false;
  const spells = () => getLoadout(healerId).spells;
  const buttonFor = id => [...root.querySelectorAll('[data-ability]')].find(el => el.dataset.ability === id);
  function render() {
    const loadout = getLoadout(healerId), abilities = loadout.spells;
    const sections = [...new Set(abilities.map(s => s.section || 'healing'))];
    const preview = new Combat(undefined, Math.random, loadout.party, loadout.spells);
    root.innerHTML = sections.map(section => `<div class="ability-bar team-ability-bar" role="group" aria-label="${activeHealer(healerId).role} ${section} abilities" aria-describedby="ability-instructions">${abilities.filter(s => (s.section || 'healing') === section).map(s => {
      const resolved = loadout.spells.find(spell => spell.id === s.id) || s;
      return `<button type="button" class="spell" data-ability="${s.id}" data-icon="${s.icon}" aria-haspopup="dialog" aria-label="Configure ${s.name}, key ${s.key}" data-tooltip="${abilityTooltip(preview, resolved)}\nDrag to reorder · Right-click to rebind">${abilityIcon(s)}</button>`;
    }).join('')}</div>`).join('');
  }
  function changed(message, focusId) {
    render(); status.textContent = message; onChange();
    if (focusId) buttonFor(focusId)?.focus({ preventScroll: true });
  }
  function neighbours(id) {
    const ability = spells().find(s => s.id === id);
    const group = spells().filter(s => (s.section || 'healing') === (ability?.section || 'healing')), index = group.findIndex(s => s.id === id);
    return [group[index - 1], group[index + 1]];
  }
  function refreshDialog() {
    const spell = spells().find(s => s.id === configuring);
    title.textContent = spell.name;
    document.querySelector('#ability-current-bind').textContent = `Current keybind: ${spell.key}`;
    const [before, after] = neighbours(configuring);
    left.disabled = !before; right.disabled = !after;
  }
  function open(id) {
    configuring = id; feedback.textContent = ''; refreshDialog(); dialog.showModal(); title.focus();
  }
  function move(id, direction, focus = false) {
    const target = neighbours(id)[direction < 0 ? 0 : 1];
    if (target && settings.move(healerId, id, target.id)) {
      changed(`${spells().find(s => s.id === id).name} moved ${direction < 0 ? 'left' : 'right'}.`, focus ? id : null);
      if (dialog.open) refreshDialog();
    }
  }
  root.addEventListener('contextmenu', event => {
    const button = event.target.closest('[data-ability]');
    if (!button) return;
    event.preventDefault(); open(button.dataset.ability);
  });
  root.addEventListener('click', event => {
    if (suppressClick && event.detail > 0) { suppressClick = false; return; }
    suppressClick = false;
    const button = event.target.closest('[data-ability]');
    if (button) open(button.dataset.ability);
  });
  root.addEventListener('keydown', event => {
    const button = event.target.closest('[data-ability]');
    if (button && event.altKey && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault(); move(button.dataset.ability, event.key === 'ArrowLeft' ? -1 : 1, true);
    }
  });
  root.addEventListener('dragstart', event => event.preventDefault());
  root.addEventListener('pointerdown', event => {
    const button = event.target.closest('[data-ability]');
    if (!button || event.button !== 0 || !event.isPrimary) return;
    suppressClick = false;
    drag = { button, id: button.dataset.ability, x: event.clientX, y: event.clientY, pointerId: event.pointerId, active: false };
    button.setPointerCapture(event.pointerId);
  });
  function targetAt(event) {
    return [...drag.button.parentElement.querySelectorAll('[data-ability]')].find(button => {
      const rect = button.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
  }
  root.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6) drag.active = true;
    if (!drag.active) return;
    drag.button.classList.add('is-dragging');
    const target = targetAt(event);
    root.querySelectorAll('[data-ability]').forEach(button => button.classList.toggle('drop-target', button === target && button !== drag.button));
  });
  function stopDrag(event, cancelled = false) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const current = drag, target = !cancelled && targetAt(event);
    drag = null; suppressClick = current.active;
    current.button.classList.remove('is-dragging');
    root.querySelectorAll('.drop-target').forEach(button => button.classList.remove('drop-target'));
    if (current.button.hasPointerCapture(event.pointerId)) current.button.releasePointerCapture(event.pointerId);
    if (current.active && target && settings.move(healerId, current.id, target.dataset.ability)) {
      changed(`${spells().find(s => s.id === current.id).name} moved.`, current.id);
    }
  }
  root.addEventListener('pointerup', event => stopDrag(event));
  root.addEventListener('pointercancel', event => stopDrag(event, true));
  root.addEventListener('lostpointercapture', event => stopDrag(event, true));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape' || event.key === 'Tab' || event.key === 'Enter') return;
    event.preventDefault(); event.stopPropagation();
    if (event.repeat || ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
    const binding = bindingFromEvent(event);
    if (!binding) { feedback.textContent = 'Choose a letter or number, optionally with Shift or Ctrl + Alt. Navigation and browser shortcuts are reserved.'; return; }
    const name = spells().find(s => s.id === configuring).name;
    const result = settings.bind(healerId, configuring, binding);
    const other = result.swapped && spells().find(s => s.id === result.swapped);
    changed(`${name} bound to ${binding}.${other ? ` ${other.name} now uses ${other.key}.` : ''}`);
    dialog.close();
  });
  left.addEventListener('click', () => move(configuring, -1));
  right.addEventListener('click', () => move(configuring, 1));
  document.querySelector('#ability-config-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { buttonFor(configuring)?.focus({ preventScroll: true }); configuring = null; });
  return { show(id) { healerId = id; status.textContent = ''; render(); } };
}
