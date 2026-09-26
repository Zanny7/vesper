import { GEAR } from '../src/data.js';
import { Equipment } from '../src/gear.js';
import { ITEM_OWNERS } from '../src/item-model.js';
import { itemIcon, equipmentSlot, setupEquipment, statLabels } from '../src/equipment.js';

// Intentionally no storage adapter: this sandbox can never grant player gear.
const gear = new Equipment();
GEAR.forEach(item => gear.acquire(item.id));
const names = { priest: 'Priest', druid: 'Druid', shaman: 'Shaman', tank: 'Aldric', rogue: 'Nyx', mage: 'Sera', ranger: 'Theron' };
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const statsText = stats => Object.entries(stats).map(([key, value]) => `${statLabels[key] || key}: +${value}`).join(' · ');
let member = { id: 'priest' };
const owner = document.querySelector('#owner');
owner.innerHTML = ITEM_OWNERS.map(id => `<option value="${id}">${names[id]}</option>`).join('');
const ui = setupEquipment({ equipment: gear, isLocked: () => false, onChange: render });
function render() {
  document.querySelector('#sheet').innerHTML = gear.slots(member).map(slot => equipmentSlot(member, slot, gear.item(member, slot), false)).join('');
  document.querySelectorAll('[data-equipment-slot]').forEach(button => {
    button.onclick = () => ui.open(button, member, button.dataset.equipmentSlot);
  });
  const { id, ...bonuses } = gear.apply(member);
  document.querySelector('#totals').textContent = `Equipment bonuses — ${statsText(bonuses) || 'None'}`;
  ui.renderInventory();
}
owner.onchange = () => { ui.close(); member = { id: owner.value }; render(); };
render();
// New chapters automatically join the review page when their catalogue lands.
const chapters = [...new Set(GEAR.map(item => item.chapter))].sort((a, b) => a - b);
document.querySelector('#catalogue').innerHTML = chapters.map(chapter => `<section><h2>Chapter ${chapter}</h2><div class="gallery">${GEAR.filter(item => item.chapter === chapter).map(item => `<article><div class="sizes"><button type="button" class="gear-slot is-equipped" data-item-id="${escape(item.id)}" aria-label="Inspect ${escape(item.name)}">${itemIcon(item)}</button><img class="tiny" src="${escape(item.icon)}" alt="${escape(item.name)}"></div><h3>${escape(item.name)}</h3><small>${names[item.owner]} · ${item.slot} · ilvl ${item.itemLevel}</small><p class="stats">${escape(statsText(item.stats))}</p><small>${escape(item.flavor || '')}</small></article>`).join('')}</div></section>`).join('');
