import { CHAPTERS } from './data.js';
import { itemDetails, itemIcon } from './equipment.js';
import { itemBorderAttributes } from './eras.js';

export function setupEliteRewards({ equipment, onClaim }) {
  const launcher = document.createElement('button');
  launcher.type = 'button'; launcher.className = 'primary elite-reward-launcher'; launcher.hidden = true;
  const dialog = document.createElement('dialog');
  dialog.id = 'elite-reward-choice'; dialog.className = 'elite-reward-dialog'; dialog.setAttribute('aria-labelledby', 'elite-reward-title');
  dialog.innerHTML = `<span class="eyebrow">ELITE REWARD SUCCEEDED</span><h2 id="elite-reward-title">Choose one reward</h2><p id="elite-reward-context"></p><div class="elite-reward-options" role="group" aria-label="Eligible item choices"></div><p class="elite-reward-message" role="status"></p><div class="elite-reward-actions"><button type="button" class="quiet elite-reward-later">Choose later</button><button type="button" class="primary elite-reward-confirm" disabled>Claim selected item</button></div>`;
  document.body.append(launcher, dialog);
  let rewardId = null, selected = null;
  const options = dialog.querySelector('.elite-reward-options'), confirm = dialog.querySelector('.elite-reward-confirm'), message = dialog.querySelector('.elite-reward-message');
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
    rewardId = reward.id; selected = null; confirm.disabled = true; confirm.hidden = !reward.items.length; message.textContent = '';
    dialog.querySelector('.elite-reward-later').textContent = reward.items.length ? 'Choose later' : 'Continue';
    const node = CHAPTERS.flatMap(chapter => chapter.nodes).find(node => node.encounter === reward.encounter);
    dialog.querySelector('#elite-reward-context').textContent = `${node.name} · Select one item to add to Inventory. Your choice is saved if you return later.`;
    options.innerHTML = reward.items.map(item => `<button type="button" class="elite-reward-option" data-choice-id="${item.id}" aria-pressed="false"><span class="gear-slot is-equipped" ${itemBorderAttributes(item)}>${itemIcon(item)}</span><span class="elite-reward-details">${itemDetails(item)}</span></button>`).join('');
    if (!reward.items.length) {
      message.textContent = 'You already own every eligible item. No additional item can be claimed.';
      equipment.dismissExhaustedEliteReward(reward.id); refresh();
    }
    dialog.showModal();
  }
  options.addEventListener('click', event => {
    const button = event.target.closest('[data-choice-id]'); if (!button) return;
    selected = button.dataset.choiceId;
    for (const option of options.children) option.setAttribute('aria-pressed', String(option === button));
    confirm.disabled = false; message.textContent = 'One selection. Claiming adds this item to Inventory.';
  });
  confirm.addEventListener('click', () => {
    const item = equipment.claimEliteReward(rewardId, selected);
    if (!item) { message.textContent = 'This item is no longer available. Reopen the reward to choose an eligible item.'; confirm.disabled = true; return; }
    confirm.disabled = true; options.innerHTML = '';
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
