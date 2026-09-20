import { healingSummary } from './ability-presentation.js';
import { CONFIG, HEALERS } from './data.js';
import { activeHealer, activeParty, loadActiveHealer, saveActiveHealer } from './healers.js';
import { setupTeamAbilities } from './team-abilities.js';

// This screen reads starting character data; inspecting never changes combat.
export function setupTeam({ paintPortrait, onHealerChange, settings, onAbilitiesChange }) {
  const roster = document.querySelector('#team-roster');
  const details = document.querySelector('#team-details');
  const roles = { TANK: 'Tank', DPS: 'Damage', HEALER: 'Healer' };
  const format = value => value.toLocaleString('en-US');
  let healerId = loadActiveHealer(), selected = healerId, cards = [];
  const abilityEditor = setupTeamAbilities({ settings, onChange: onAbilitiesChange });
  function buildCards() {
    roster.innerHTML = '';
    const party = activeParty(healerId);
    cards = party.map(member => {
    const card = document.createElement('button');
    card.className = 'team-card';
    card.style.setProperty('--hero-color', member.color);
    card.setAttribute('aria-controls', 'team-details');
    card.setAttribute('aria-label', `Inspect ${member.name}, ${member.role}, ${roles[member.label]}`);
    card.innerHTML = `<span class="team-card-role">${roles[member.label]}${member.label === 'HEALER' ? ' · Your hero' : ''}</span><canvas aria-hidden="true"></canvas><strong>${member.name}</strong><span class="team-class">${member.role}</span><span class="team-card-stats">${format(member.maxHp)} health<span>${member.damage ? `${member.damage} damage / hit` : `${format(member.maxMana)} mana`}</span></span><span class="team-selection"></span>`;
    paintPortrait(card.querySelector('canvas'), member);
    card.addEventListener('click', () => {
      selected = member.id;
      render();
      document.querySelector('#team-detail-name').focus({ preventScroll: true });
      details.scrollIntoView({ block: 'nearest' });
    });
    roster.append(card);
    return card;
    });
  }
  const healerOptions = document.querySelector('#healer-options');
  healerOptions.innerHTML = Object.values(HEALERS).map(healer => `<button type="button" class="healer-option" role="radio" data-healer="${healer.id}"><span class="healer-option-mark" aria-hidden="true">◇</span><span><strong>${healer.role}</strong><small>${healer.id === 'priest' ? 'Direct healing' : 'Healing over time'}</small></span></button>`).join('');
  healerOptions.addEventListener('click', event => {
    const option = event.target.closest('[data-healer]');
    if (!option || option.dataset.healer === healerId) return;
    healerId = saveActiveHealer(option.dataset.healer); selected = healerId;
    buildCards(); render(); onHealerChange(healerId);
  });
  function render() {
    const party = activeParty(healerId), member = party.find(hero => hero.id === selected) || party.at(-1), healer = activeHealer(healerId);
    healerOptions.querySelectorAll('[data-healer]').forEach(option => {
      const active = option.dataset.healer === healerId;
      option.setAttribute('aria-checked', String(active));
      option.querySelector('.healer-option-mark').textContent = active ? '✦' : '◇';
    });
    cards.forEach((card, index) => {
      const active = party[index].id === selected;
      card.setAttribute('aria-pressed', String(active));
      card.querySelector('.team-selection').textContent = active ? '◇ Selected' : 'Inspect character →';
    });
    details.style.setProperty('--hero-color', member.color);
    const stats = member.damage
      ? [['Maximum health', format(member.maxHp)], ['Damage per attack', member.damage], ['Attack interval', `${member.interval}s`]]
      : [['Maximum health', format(member.maxHp)], ['Maximum mana', format(member.maxMana)], ['Mana regeneration', `${member.manaRegen} / second`]];
    stats.push(['Armor', member.armor], ['Resistance', member.resistance]);
    if (member.label === 'HEALER') stats.push(['Spell Power', member.spellPower]);
    const spells = healer.spellBook;
    const spellBook = spells.length
      ? `<div class="team-spells">${spells.map(spell => `<article><h4>${spell.name}</h4><p>${spell.description}</p><dl><div><dt>Healing</dt><dd>${healingSummary(spell)}</dd></div><div><dt>Mana cost</dt><dd>${format(spell.cost * CONFIG.baseMana)}</dd></div><div><dt>${spell.channel ? 'Channel' : 'Base cast'}</dt><dd>${spell.cast ? spell.cast + 's' : 'Instant'}</dd></div>${spell.cooldown ? `<div><dt>Cooldown</dt><dd>${spell.cooldown}s</dd></div>` : ''}</dl></article>`).join('')}</div>`
      : `<p class="team-behavior">${healer.description}</p>`;
    const body = member.damage
      ? `<p class="team-behavior">${member.label === 'TANK' ? 'Holds the front line and takes the Warden’s heavy strikes.' : 'Attacks the Warden automatically while alive.'} Attacks deal ${member.damage} damage every ${member.interval} seconds during combat.</p>`
      : `<p class="team-behavior">${healer.description}</p>`;
    details.innerHTML = `<div class="team-detail-heading"><div><span class="eyebrow">${roles[member.label]} · ${member.role}</span><h2 id="team-detail-name" tabindex="-1">${member.name}${member.label === 'HEALER' ? ` · Your ${member.role.toLowerCase()}` : ''}</h2></div><span class="team-baseline">Starting stats · Before encounter effects</span></div><dl class="team-stat-grid">${stats.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>${body}`;
    document.querySelector('#team-spell-book').innerHTML = spellBook;
    abilityEditor.show(healerId);
  }
  buildCards();
  render();
}
