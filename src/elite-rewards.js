import { CHAPTERS } from './data.js';
import { itemDetails, itemIcon } from './equipment.js';
import { itemBorderAttributes } from './eras.js';

export function setupEliteRewards({ equipment, onClaim }) {
  const launcher = document.createElement('button');
  launcher.type = 'button'; launcher.className = 'primary elite-reward-launcher'; launcher.hidden = true;
  const dialog = document.createElement('dialog');
  dialog.id = 'elite-reward-choice'; dialog.className = 'elite-reward-dialog'; dialog.setAttribute('aria-labelledby', 'elite-reward-title');
  dialog.innerHTML = `<span class="eyebrow">ELITE REWARD SUCCEEDED</span><h2 id="elite-reward-title" tabindex="-1">Choose one reward</h2><p id="elite-reward-context"></p><div class="elite-reward-options" role="group" aria-label="Eligible item choices"></div><p class="elite-reward-message" role="status"></p><div class="elite-reward-actions"><button type="button" class="quiet elite-reward-later">Choose later</button><button type="button" class="primary elite-reward-confirm" disabled>Claim selected item</button></div><div class="elite-reward-tooltip" id="elite-reward-tooltip" hidden role="tooltip"></div>`;
  document.body.append(launcher, dialog);
  let rewardId = null, selected = null, items = [];
  const options = dialog.querySelector('.elite-reward-options'), confirm = dialog.querySelector('.elite-reward-confirm'), message = dialog.querySelector('.elite-reward-message'), tooltip = dialog.querySelector('.elite-reward-tooltip');
  function placeTooltip(target) {
    const rect = target.getBoundingClientRect(), width = tooltip.offsetWidth, height = tooltip.offsetHeight;
    const right = rect.right + 10, left = rect.left - width - 10, viewportWidth = document.documentElement.clientWidth;
    const preferred = right + width <= viewportWidth - 8 ? right : left >= 8 ? left : rect.left;
    tooltip.style.left = `${Math.max(8, Math.min(viewportWidth - width - 8, preferred))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(rect.top, innerHeight - height - 8))}px`;
  }
  function preview(id, target = null) {
    const item = items.find(item => item.id === id);
    tooltip.hidden = !item;
    tooltip.innerHTML = item ? itemDetails(item) : '';
    if (item && target) placeTooltip(target);
  }
  function refresh(open = false) {
    const pending = equipment.pendingEliteRewards();
    launcher.hidden = !pending.length;
    launcher.disabled = equipment.isLocked();
    launcher.textContent = `Choose elite reward${pending.length > 1 ? ` (${pending.length})` : ''}`;
    if (open && pending.length && !dialog.open && !document.querySelector('dialog[open]')) show();
  }
  function show() {
    if (equipment.isLocked()) return;
    const reward = equipment.pendingEliteRewards()[0]; if (!reward) return refresh();
    rewardId = reward.id; selected = null; items = reward.items; confirm.disabled = true; confirm.hidden = !items.length; message.textContent = ''; preview(null);
    dialog.querySelector('.elite-reward-later').textContent = reward.items.length ? 'Choose later' : 'Continue';
    const node = CHAPTERS.flatMap(chapter => chapter.nodes).find(node => node.encounter === reward.encounter);
    dialog.querySelector('#elite-reward-context').textContent = `${node.name} · Select one item to add to Inventory. Your choice is saved if you return later.`;
    options.innerHTML = items.map(item => `<button type="button" class="elite-reward-option gear-slot is-equipped" ${itemBorderAttributes(item)} data-choice-id="${item.id}" aria-label="${item.name}, item level ${item.itemLevel}. Show details and select" aria-pressed="false" aria-controls="elite-reward-tooltip">${itemIcon(item)}</button>`).join('');
    if (!reward.items.length) {
      message.textContent = 'You already own every eligible item. No additional item can be claimed.';
      equipment.dismissExhaustedEliteReward(reward.id); refresh();
    }
    dialog.showModal();
    dialog.querySelector('#elite-reward-title').focus();
  }
  options.addEventListener('click', event => {
    const button = event.target.closest('[data-choice-id]'); if (!button) return;
    selected = button.dataset.choiceId;
    preview(selected, button);
    for (const option of options.children) option.setAttribute('aria-pressed', String(option === button));
    confirm.disabled = false; message.textContent = 'One selection. Claiming adds this item to Inventory.';
  });
  options.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    const button = event.target.closest('[data-choice-id]');
    if (button) preview(button.dataset.choiceId, button);
  });
  options.addEventListener('pointerout', event => {
    if (event.pointerType !== 'touch' && !options.contains(event.relatedTarget)) preview(selected, selected ? options.querySelector(`[data-choice-id="${CSS.escape(selected)}"]`) : null);
  });
  options.addEventListener('focusin', event => {
    const button = event.target.closest('[data-choice-id]');
    if (button) preview(button.dataset.choiceId, button);
  });
  options.addEventListener('focusout', event => {
    if (!options.contains(event.relatedTarget)) preview(selected, selected ? options.querySelector(`[data-choice-id="${CSS.escape(selected)}"]`) : null);
  });
  confirm.addEventListener('click', () => {
    const item = equipment.claimEliteReward(rewardId, selected);
    if (!item) { message.textContent = 'This item is no longer available. Reopen the reward to choose an eligible item.'; confirm.disabled = true; return; }
    confirm.disabled = true; options.innerHTML = ''; preview(null);
    message.textContent = `${item.name} added to Inventory.`;
    dialog.querySelector('.elite-reward-later').textContent = 'Continue'; confirm.hidden = true;
    refresh(); onClaim(item);
  });
  launcher.addEventListener('click', show);
  dialog.querySelector('.elite-reward-later').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => refresh());
  refresh(true);
  return { refresh };
}
