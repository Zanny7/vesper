import { PARTY, CONFIG, SPELLS } from './data.js';

// This screen reads starting character data; inspecting never changes combat.
export function setupTeam(paintPortrait) {
  const roster = document.querySelector('#team-roster');
  const details = document.querySelector('#team-details');
  const roles = { TANK: 'Tank', DPS: 'Damage', HEALER: 'Healer' };
  const format = value => value.toLocaleString('en-US');
  let selected = PARTY[0].id;
  const cards = PARTY.map(member => {
    const card = document.createElement('button');
    card.className = 'team-card';
    card.style.setProperty('--hero-color', member.color);
    card.setAttribute('aria-controls', 'team-details');
    card.setAttribute('aria-label', `Inspect ${member.name}, ${member.role}, ${roles[member.label]}`);
    card.innerHTML = `<span class="team-card-role">${roles[member.label]}${member.id === 'priest' ? ' · Your hero' : ''}</span><canvas aria-hidden="true"></canvas><strong>${member.name}</strong><span class="team-class">${member.role}</span><span class="team-card-stats">${format(member.maxHp)} health<span>${member.damage ? `${member.damage} damage / hit` : `${format(CONFIG.mana)} mana`}</span></span><span class="team-selection"></span>`;
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
  function render() {
    const member = PARTY.find(hero => hero.id === selected);
    cards.forEach((card, index) => {
      const active = PARTY[index].id === selected;
      card.setAttribute('aria-pressed', String(active));
      card.querySelector('.team-selection').textContent = active ? '◇ Selected' : 'Inspect character →';
    });
    details.style.setProperty('--hero-color', member.color);
    const stats = member.damage
      ? [['Maximum health', format(member.maxHp)], ['Damage per attack', member.damage], ['Attack interval', `${member.interval}s`]]
      : [['Maximum health', format(member.maxHp)], ['Maximum mana', format(CONFIG.mana)], ['Mana regeneration', `${CONFIG.manaRegen} / second`]];
    details.innerHTML = `<div class="team-detail-heading"><div><span class="eyebrow">${roles[member.label]} · ${member.role}</span><h2 id="team-detail-name" tabindex="-1">${member.name}${member.id === 'priest' ? ' · Your priest' : ''}</h2></div><span class="team-baseline">Starting stats · Before encounter effects</span></div><dl class="team-stat-grid">${stats.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>${member.damage ? `<p class="team-behavior">${member.label === 'TANK' ? 'Holds the front line and takes the Warden’s heavy strikes.' : 'Attacks the Warden automatically while alive.'} Attacks deal ${member.damage} damage every ${member.interval} seconds during combat.</p>` : `<h3 class="team-spell-heading">Healing spells</h3><div class="team-spells">${SPELLS.map(spell => `<article><h4>${spell.name}</h4><p>${spell.description}</p><dl><div><dt>Healing</dt><dd>${spell.heal}${spell.party ? ' / ally' : ''}</dd></div><div><dt>Mana cost</dt><dd>${format(spell.cost * CONFIG.baseMana)}</dd></div><div><dt>${spell.channel ? 'Channel' : 'Base cast'}</dt><dd>${spell.cast}s</dd></div>${spell.cooldown ? `<div><dt>Cooldown</dt><dd>${spell.cooldown}s</dd></div>` : ''}</dl></article>`).join('')}</div>`}`;
  }
  render();
}
