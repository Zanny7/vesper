// Shared presentation surfaces; per-item artwork and loot progression belong to BAT-21.
import { GEAR, partyForHealer, HEALERS } from './data.js';
import { formatNumber } from './stats.js';
export const statLabels = { maxHp: 'Health', maxMana: 'Mana', manaRegen: 'Mana regeneration', spellPower: 'Spell Power', haste: 'Haste', crit: 'Crit', armor: 'Armor', resistance: 'Resistance', damage: 'Damage' };
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const silhouettes = {
  Head: '<path d="M10 26V16a10 10 0 0 1 20 0v10l-7 5v-9h-6v9Z"/><path d="M13 16h14M20 6v10"/>',
  Chest: '<path d="m12 7-7 7 5 6 3-3-2 16h18l-2-16 3 3 5-6-7-7-5 4h-6Z"/>',
  Legs: '<path d="M11 7h18l2 26H21l-1-17-1 17H9Z"/><path d="M11 12h18"/>',
  Sword: '<path d="m25 5 8 2-2 8-13 13-6-6Z"/><path d="m8 19 13 13M14 26l-7 7M5 31l4 4"/>',
  Staff: '<path d="m13 35 10-23M19 6l5-3 7 5-4 8-7-1Z"/><path d="m10 28 9 4"/>',
  Bow: '<path d="M10 5q32 15 0 30l7-15Z"/><path d="M6 20h27m-5-4 5 4-5 4"/>',
  Tome: '<path d="M8 7h23v27H8q-5-3 0-6h23M10 7v21"/><path d="m21 12 5 6-5 6-5-6Z"/>',
  Shield: '<path d="m20 5 13 5-2 15-11 10L9 25 7 10Z"/><path d="M20 9v21M11 15h18"/>',
  Trinket: '<path d="M13 5q7 21 14 0M20 18l9 9-9 9-9-9Z"/><circle cx="20" cy="27" r="3"/>',
  Bag: '<path d="M14 6h12l-3 7q12 7 10 17-1 6-13 6T7 30q-2-10 10-17Z"/><path d="M14 13h12M16 6l4 7 4-7"/>',
};
export const itemLevel = item => item.itemLevel ?? 1;
export function itemIcon(item, slot = item?.slot || 'Bag', owner = item?.owner) {
  if (item?.icon) return `<img src="${escape(item.icon)}" alt="" draggable="false">`;
  const type = slot === 'Weapon' ? (Object.hasOwn(HEALERS, owner) ? 'Staff' : 'Sword') : slot;
  return `<svg viewBox="0 0 40 40" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">${silhouettes[type] || silhouettes.Bag}</svg>`;
}
export function equipmentSlot(member, slot, item, locked) {
  return `<button type="button" class="gear-slot ${item ? 'is-equipped' : 'is-empty'}" data-equipment-slot="${slot}" data-member-id="${escape(member.id)}" ${item ? `data-item-id="${escape(item.id)}" draggable="${!locked}"` : `data-slot-tip="${slot}"`} aria-label="${slot}: ${escape(item?.name || 'Empty')}" aria-haspopup="dialog" aria-expanded="false" ${locked ? 'disabled' : ''}>${itemIcon(item, slot, member.id)}</button>`;
}
export function setupEquipment({ equipment, onChange, isLocked }) {
  const popup = document.createElement('section'), tooltip = document.createElement('div');
  popup.id = 'gear-picker'; popup.className = 'gear-picker'; popup.hidden = true; popup.setAttribute('role', 'dialog'); popup.setAttribute('aria-label', 'Choose equipment');
  tooltip.id = 'gear-tooltip'; tooltip.className = 'gear-tooltip'; tooltip.hidden = true; tooltip.setAttribute('role', 'tooltip');
  document.body.append(popup, tooltip);
  let anchor = null, tipAnchor = null, page = 0, dragging = null, suppressClickUntil = 0;
  const find = id => equipment.collection().find(item => item.id === id) || GEAR.find(item => item.id === id);
  function place(panel, target) {
    const rect = target.getBoundingClientRect(), width = panel.offsetWidth, height = panel.offsetHeight;
    const right = rect.right + 10, left = rect.left - width - 10, viewportWidth = document.documentElement.clientWidth;
    panel.style.left = `${Math.max(8, Math.min(viewportWidth - width - 8, right + width < viewportWidth ? right : left >= 8 ? left : rect.left))}px`;
    panel.style.top = `${Math.max(8, Math.min(rect.top, innerHeight - height - 8))}px`;
  }
  function hideTip() { tipAnchor?.removeAttribute('aria-describedby'); tooltip.hidden = true; tipAnchor = null; }
  function showTip(target) {
    const item = find(target.dataset.itemId);
    if (!item && !target.dataset.slotTip) return;
    hideTip(); tipAnchor = target;
    tooltip.innerHTML = item ? `<strong>${escape(item.name)}</strong><small>Item level ${itemLevel(item)} · ${escape(item.slot)}</small><dl>${Object.entries(item.stats).map(([stat, value]) => `<div><dt>${escape(statLabels[stat] || stat)}</dt><dd>+${formatNumber(value)}${['haste', 'crit'].includes(stat) ? '%' : ''}</dd></div>`).join('')}</dl>${item.flavor ? `<p>${escape(item.flavor)}</p>` : ''}` : `<strong>${escape(target.dataset.slotTip)}</strong>`;
    tooltip.hidden = false; target.setAttribute('aria-describedby', tooltip.id); place(tooltip, target);
  }
  function close(focus = false) {
    const previous = anchor; anchor?.setAttribute('aria-expanded', 'false'); anchor = null; popup.hidden = true; hideTip();
    if (focus && previous?.isConnected) previous.focus();
  }
  function open(target, member, slot) {
    if (isLocked()) return;
    const same = anchor === target; close(); if (same) return;
    anchor = target; target.setAttribute('aria-expanded', 'true');
    const current = equipment.item(member, slot), items = equipment.owned(member, slot);
    popup.innerHTML = `<div class="gear-picker-heading"><strong>${escape(slot)}</strong><button type="button" aria-label="Close equipment picker">✕</button></div><p>Choose owned equipment</p><div class="gear-choices">${items.map(item => `<button type="button" class="gear-choice" data-item-id="${escape(item.id)}" aria-pressed="${current?.id === item.id}"><span class="gear-slot is-equipped">${itemIcon(item)}</span><span><strong>${escape(item.name)}</strong><small>Item level ${itemLevel(item)}${current?.id === item.id ? ' · Equipped' : ''}</small></span></button>`).join('') || '<p>No compatible items owned.</p>'}</div>${current ? '<button type="button" class="quiet gear-unequip">Unequip</button>' : ''}`;
    popup.hidden = false; place(popup, target);
    popup.querySelector('.gear-picker-heading button').onclick = () => close(true);
    const choose = id => {
      if (isLocked() || !equipment.equip(member, slot, id)) return close(true);
      close(); onChange(); renderInventory();
      document.querySelector(`[data-equipment-slot="${slot}"]`)?.focus();
    };
    popup.querySelectorAll('.gear-choice').forEach(button => button.onclick = () => choose(button.dataset.itemId));
    popup.querySelector('.gear-unequip')?.addEventListener('click', () => choose(''));
    popup.querySelector('.gear-choice, .gear-picker-heading button').focus();
  }
  function renderInventory() {
    hideTip();
    const host = document.querySelector('#inventory-content'), pages = Math.max(1, Math.ceil(equipment.bagSlots.length / 20));
    page = Math.min(page, pages - 1);
    const start = page * 20;
    host.innerHTML = `<div class="bag-grid" role="group" aria-label="Inventory, 20 slots">${Array.from({ length: 20 }, (_, i) => {
      const index = start + i, item = equipment.bagItem(index);
      return item ? `<button type="button" class="gear-slot is-equipped" data-item-id="${escape(item.id)}" data-bag-index="${index}" draggable="${!isLocked()}" aria-label="${escape(item.name)}, item level ${itemLevel(item)}" aria-haspopup="dialog">${itemIcon(item)}</button>` : `<button type="button" class="gear-slot is-empty bag-drop-slot" data-bag-index="${index}" aria-label="Empty bag slot" ${isLocked() ? 'disabled' : ''}>${itemIcon(null)}</button>`;
    }).join('')}</div><div class="bag-footer"><span>${equipment.ownedIds.size} owned · ${page + 1} / ${pages}</span><button class="quiet" type="button" data-bag-page="-1" aria-label="Previous inventory page" ${page === 0 ? 'disabled' : ''}>←</button><button class="quiet" type="button" data-bag-page="1" aria-label="Next inventory page" ${page === pages - 1 ? 'disabled' : ''}>→</button></div><p class="bag-help">Inspect items here. Equip them in Team.</p>`;
    host.querySelector('.bag-footer > span').textContent = `${equipment.ownedIds.size} owned · ${page + 1} / ${pages}`;
    host.querySelector('.bag-help').textContent = 'Drag items to equipment slots. Right-click to discard.';
    host.querySelectorAll('[data-bag-page]').forEach(button => button.onclick = () => { page += Number(button.dataset.bagPage); renderInventory(); host.querySelector('[data-item-id]')?.focus(); });
    host.querySelectorAll('[data-item-id]').forEach(button => button.onclick = () => showTip(button));
  }
  document.addEventListener('pointerover', event => { const target = event.target.closest('[data-item-id], [data-slot-tip]'); if (target) showTip(target); });
  document.addEventListener('pointerout', event => { if (tipAnchor && !tipAnchor.contains(event.relatedTarget)) hideTip(); });
  document.addEventListener('focusin', event => { const target = event.target.closest('[data-item-id], [data-slot-tip]'); if (target) showTip(target); else hideTip(); });
  document.addEventListener('contextmenu', event => {
    const target = event.target.closest('[data-bag-index][data-item-id]');
    if (!target) return;
    event.preventDefault();
    const item = equipment.bagItem(Number(target.dataset.bagIndex));
    if (!item || isLocked()) return;
    hideTip();
    anchor = target;
    popup.innerHTML = `<div class="gear-picker-heading"><strong>Discard item?</strong><button type="button" aria-label="Cancel discard">✕</button></div><p class="discard-summary"><span class="gear-slot is-equipped">${itemIcon(item)}</span><span><b>${escape(item.name)}</b><small>Item level ${itemLevel(item)} · ${escape(item.slot)}</small></span></p><div class="discard-actions"><button type="button" class="discard-confirm">Discard item</button><button type="button" class="quiet discard-cancel">Cancel</button></div>`;
    popup.hidden = false; place(popup, target);
    const cancel = () => close(true);
    popup.querySelector('.gear-picker-heading button').onclick = cancel;
    popup.querySelector('.discard-cancel').onclick = cancel;
    popup.querySelector('.discard-confirm').onclick = () => {
      if (equipment.discard(item.id)) { close(); onChange(); renderInventory(); }
    };
    popup.querySelector('.discard-cancel').focus();
  });
  document.addEventListener('dragstart', event => {
    const target = event.target.closest('[data-item-id][draggable="true"]');
    if (!target || isLocked()) { event.preventDefault(); return; }
    const bagIndex = target.dataset.bagIndex;
    const equipmentSlotName = target.dataset.equipmentSlot;
    if (bagIndex === undefined && !equipmentSlotName) return;
    dragging = bagIndex !== undefined ? { source: 'bag', index: Number(bagIndex), id: target.dataset.itemId } : { source: 'equipment', memberId: target.dataset.memberId, slot: equipmentSlotName, id: target.dataset.itemId };
    target.classList.add('is-dragging');
    event.dataTransfer?.setData('text/plain', dragging.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    hideTip(); close();
  });
  document.addEventListener('dragover', event => {
    if (!dragging) return;
    const target = event.target.closest('[data-bag-index], [data-equipment-slot]');
    if (!target) return;
    const member = target.hasAttribute('data-equipment-slot') ? resolveMember(target.dataset.memberId) : null;
    const valid = dragging.source === 'bag'
      ? Boolean(member && equipment.owned(member, target.dataset.equipmentSlot).some(item => item.id === dragging.id) && (!equipment.equippedAt(dragging.id) || equipment.item(member, target.dataset.equipmentSlot)?.id === dragging.id))
      : target.hasAttribute('data-bag-index') && !equipment.bagSlots[Number(target.dataset.bagIndex)];
    target.classList.toggle('drop-allowed', Boolean(valid)); target.classList.toggle('drop-rejected', !valid);
    if (valid) { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'; }
  });
  document.addEventListener('dragleave', event => {
    const target = event.target.closest('.drop-allowed, .drop-rejected');
    if (target && !target.contains(event.relatedTarget)) target.classList.remove('drop-allowed', 'drop-rejected');
  });
  document.addEventListener('drop', event => {
    if (!dragging) return;
    event.preventDefault();
    const source = dragging, target = event.target.closest('[data-bag-index], [data-equipment-slot]');
    document.querySelectorAll('.drop-allowed, .drop-rejected').forEach(node => node.classList.remove('drop-allowed', 'drop-rejected'));
    const sourceNode = document.querySelector(`[data-item-id="${CSS.escape(source.id)}"][draggable="true"]`);
    sourceNode?.classList.remove('is-dragging');
    dragging = null; suppressClickUntil = Date.now() + 250;
    if (!target || isLocked()) return;
    let changed = false;
    if (source.source === 'bag' && target.hasAttribute('data-equipment-slot')) {
      const member = resolveMember(target.dataset.memberId);
      changed = Boolean(member && equipment.equip(member, target.dataset.equipmentSlot, source.id));
    } else if (source.source === 'equipment' && target.hasAttribute('data-bag-index')) {
      changed = equipment.unequipToBag(resolveMember(source.memberId), source.slot, Number(target.dataset.bagIndex));
    }
    if (changed) { close(); onChange(); renderInventory(); }
    else target.classList.add('drop-rejected');
  });
  document.addEventListener('dragend', event => {
    event.target.closest('.is-dragging')?.classList.remove('is-dragging');
    document.querySelectorAll('.drop-allowed, .drop-rejected').forEach(node => node.classList.remove('drop-allowed', 'drop-rejected'));
    dragging = null; suppressClickUntil = Date.now() + 250;
  });
  document.addEventListener('click', event => {
    if (Date.now() < suppressClickUntil && event.target.closest('.gear-slot, .gear-choice')) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  function resolveMember(id) { return [...partyForHealer('priest'), ...Object.values(HEALERS)].find(member => member.id === id) || null; }
  document.addEventListener('pointerdown', event => { if (!popup.contains(event.target) && !anchor?.contains(event.target)) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (!popup.hidden || !tooltip.hidden)) { event.preventDefault(); event.stopImmediatePropagation(); close(true); }
    if (event.key === 'Tab' && !popup.hidden) {
      const buttons = [...popup.querySelectorAll('button')], index = buttons.indexOf(document.activeElement);
      if (event.shiftKey && index === 0) { event.preventDefault(); buttons.at(-1).focus(); }
      else if (!event.shiftKey && index === buttons.length - 1) { event.preventDefault(); buttons[0].focus(); }
    }
  }, true);
  window.addEventListener('resize', () => close());
  window.addEventListener('scroll', event => { if (!popup.contains(event.target)) close(); }, true);
  return { open, close, renderInventory };
}
