import { PARTY, CONFIG } from './data.js';

// Equipment inspection uses starting stats, not temporary encounter buffs.
export function setupEquipment(paintPortrait) {
  const hero = PARTY.find(member => member.id === 'priest');
  const slots = ['Head', 'Chest', 'Legs', 'Boots', 'Weapon'];
  document.querySelector('#equipment-slots').innerHTML = slots.map(slot =>
    `<li><span class="empty-slot" aria-hidden="true">◇</span><div><strong>${slot}</strong><span>Empty</span></div></li>`
  ).join('');
  paintPortrait(document.querySelector('#equipment-portrait'), hero);
  document.querySelector('#equipment-hero-name').textContent = hero.name;
  document.querySelector('#equipment-hero-role').textContent = `${hero.role} · Healer`;
  const stats = [['Health', hero.maxHp], ['Mana', CONFIG.mana], ['Haste', hero.haste], ['Crit', hero.crit]];
  document.querySelector('#equipment-stats').innerHTML = stats.map(([label, value]) =>
    `<div><dt>${label}</dt><dd>${(Number.isFinite(value) ? value : 0).toLocaleString('en-US')}</dd></div>`
  ).join('');
}
