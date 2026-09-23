import { abilityTooltip } from './ability-presentation.js';
import { HEALERS } from './data.js';
import { Combat } from './combat.js';
import { loadActiveHealer, saveActiveHealer } from './healers.js';
import { setupTeamAbilities } from './team-abilities.js';
import { equipmentSlot } from './equipment.js';
import { TALENT_TREES } from './talent-trees.js';
import { TALENT_ROW_REQUIREMENTS } from './talents.js';
import { formatNumber } from './stats.js';

// This screen reads starting character data; inspecting never changes combat.
export function setupTeam({ paintPortrait, onHealerChange, settings, onAbilitiesChange, equipment, gearUI, equipmentLocked = () => false, talents, onTalentsChange = () => {}, getLoadout = healerId => ({ party: equipment.party(healerId), spells: equipment.healer(healerId).spellBook }) }) {
  const roster = document.querySelector('#team-roster');
  const details = document.querySelector('#team-details');
  const talentPanel = document.querySelector('#team-talents');
  const roles = { TANK: 'Tank', DPS: 'Damage', HEALER: 'Healer' };
  const format = formatNumber;
  let healerId = loadActiveHealer(), selected = healerId, cards = [];
  const abilityEditor = setupTeamAbilities({ settings, onChange: onAbilitiesChange, getLoadout });
  const rankCap = talent => talent.maxRank ?? 1;
  function buildCards() {
    roster.innerHTML = '';
    const party = getLoadout(healerId).party;
    cards = party.map(member => {
    const card = document.createElement('button');
    card.className = 'team-card';
    card.style.setProperty('--hero-color', member.color);
    card.setAttribute('aria-controls', 'team-details');
    card.setAttribute('aria-label', `Inspect ${member.name}, ${member.role}, ${roles[member.label]}`);
    card.innerHTML = `<span class="team-card-role">${roles[member.label]}${member.label === 'HEALER' ? ' · Your hero' : ''}</span><canvas aria-hidden="true"></canvas><strong>${member.name}</strong><span class="team-class">${member.role}</span><span class="team-selection"></span>`;
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
    if (!option || equipmentLocked() || option.dataset.healer === healerId) return;
    healerId = saveActiveHealer(option.dataset.healer); selected = healerId;
    buildCards(); render(); onHealerChange(healerId);
  });
  function render() {
    gearUI.close();
    const { party, spells } = getLoadout(healerId), member = party.find(hero => hero.id === selected) || party.at(-1), healer = party.find(hero => hero.label === 'HEALER');
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
    const stats = member.label !== 'HEALER'
      ? [['Health', format(member.maxHp)], ['Attack damage', format(member.damage)], ['Attack interval', `${format(member.interval)}s`], ['DPS', format(member.damage / member.interval)], ['Haste', `${format(member.haste || 0)}%`], ['Crit', `${format(member.crit || 0)}%`], ['Armor', format(member.armor)], ['Resistance', format(member.resistance)]]
      : [['Health', format(member.maxHp)], ['Mana', format(member.maxMana)], ['Mana regeneration', `${format(member.manaRegen)} / second`], ['Spell Power', format(member.spellPower)], ['Haste', `${format(member.haste || 0)}%`], ['Crit', `${format(member.crit || 0)}%`], ['Armor', format(member.armor)], ['Resistance', format(member.resistance)]];
    const spellModel = new Combat(undefined, Math.random, party, spells);
    const spellBook = spells.length
      ? `<div class="team-spells">${spells.map(spell => { const [, timing, ...effects] = abilityTooltip(spellModel, spell).split('\n'); return `<article><h4>${spell.name}</h4><p>${effects.join(' ')}</p><dl><div><dt>Current cast and cost</dt><dd>${timing}</dd></div></dl></article>`; }).join('')}</div>`
      : `<p class="team-behavior">${healer.description}</p>`;
    const body = member.damage
      ? `<p class="team-behavior">${member.label === 'TANK' ? 'Holds the front line and takes the enemy’s heavy strikes.' : 'Attacks the enemy automatically while alive.'} Attacks deal ${format(member.damage)} damage every ${format(member.interval)} seconds (${format(member.damage / member.interval)} DPS) before Haste.</p>`
      : `<p class="team-behavior">${healer.description}</p>`;
    const slots = equipment.slots(member);
    const locked = equipmentLocked();
    const column = side => `<div class="paper-slots">${side.map(slot => `<div class="paper-slot">${equipmentSlot(member, slot, equipment.item(member, slot), locked)}<span>${slot}</span></div>`).join('')}</div>`;
    const left = ['Head', 'Chest', 'Legs'], right = slots.filter(slot => !left.includes(slot));
    details.innerHTML = `<div class="team-detail-heading"><div><span class="eyebrow">${roles[member.label]} · ${member.role}</span><h2 id="team-detail-name" tabindex="-1">${member.name}${member.label === 'HEALER' ? ` · Your ${member.role.toLowerCase()}` : ''}</h2></div><span class="team-baseline">Character sheet</span></div><div class="character-sheet"><section class="paper-doll" aria-label="${member.role} equipment">${column(left)}<div class="paper-portrait"><canvas id="team-portrait" role="img" aria-label="${member.name}, ${member.role}"></canvas><span class="paper-caption">◇ ${member.role} ◇</span></div>${column(right)}</section><section class="character-stats" aria-label="Detailed stats"><h3>Attributes</h3><dl class="team-stat-grid">${stats.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><p class="stat-note">Includes equipment bonuses.</p></section></div>${locked ? '<p>Equipment is locked during combat.</p>' : ''}${body}`;
    paintPortrait(details.querySelector('#team-portrait'), member, 280);
    details.querySelectorAll('[data-equipment-slot]').forEach(control => control.addEventListener('click', () => gearUI.open(control, member, control.dataset.equipmentSlot)));
    document.querySelector('#team-spell-book').innerHTML = spellBook;
    abilityEditor.show(healerId);
    renderTalents();
  }
  function renderTalents(message = '') {
    const tree = TALENT_TREES[healerId] || [];
    const state = talents?.state(healerId);
    const locked = equipmentLocked();
    const row = index => tree.filter(talent => talent.row === index);
    const node = talent => {
      const rank = state?.allocations[talent.id] || 0;
      const unlocked = Boolean(state && talents.rowUnlocked(healerId, talent.row));
      const available = unlocked && !locked && rank < rankCap(talent) && state.unspentPoints > 0;
      const status = rank ? 'invested' : unlocked ? 'available' : 'locked';
      const label = `${talent.name}, ${rank} of ${rankCap(talent)} ranks. ${talent.description}`;
      return `<article class="talent-node ${status}" data-talent="${talent.id}"><div class="talent-node-top"><span class="talent-glyph" aria-hidden="true">${rank ? '✦' : unlocked ? '◇' : '⊘'}</span><span class="talent-rank">${rank} / ${rankCap(talent)}</span></div><h4>${talent.name}</h4><p>${talent.description}</p><div class="talent-actions"><button type="button" data-spend="${talent.id}" aria-label="Learn ${label}" ${available ? '' : 'disabled'}>Learn</button><button type="button" class="quiet" data-refund="${talent.id}" aria-label="Refund ${talent.name}" ${rank && !locked ? '' : 'disabled'}>Refund</button></div></article>`;
    };
    talentPanel.innerHTML = `<div class="talent-heading"><div><span class="eyebrow">${getLoadout(healerId).party.find(member => member.label === 'HEALER').role.toUpperCase()} PROGRESSION</span><h2 id="team-talents-title">Talent Tree</h2><p>Spend points freely between encounters. Each healer progresses independently.</p></div><div class="talent-points"><strong>${state?.unspentPoints ?? 0}</strong><span>Unspent<br>points</span></div></div><div class="talent-summary"><span><b>${state?.spentPoints ?? 0}</b> spent</span><span><b>${state?.earnedPoints ?? 0}</b> earned</span><button type="button" class="quiet" data-respec ${locked || !(state?.spentPoints) ? 'disabled' : ''}>Refund all points</button></div><p class="talent-status" aria-live="polite">${locked ? 'Talent changes are locked during combat.' : message || 'Select Learn to invest a point, or Refund to reclaim one.'}</p><div class="talent-rows">${[1, 2, 3, 4].map(index => { const needed = TALENT_ROW_REQUIREMENTS[index - 1]; const unlocked = state && talents.rowUnlocked(healerId, index); return `<section class="talent-row ${unlocked ? 'unlocked' : 'locked'}"><header><span>ROW ${index}</span><small>${index === 1 ? 'Available immediately' : unlocked ? `Unlocked · ${state.spentPoints} / ${needed} spent` : `${state?.spentPoints ?? 0} / ${needed} points to unlock`}</small></header><div class="talent-grid">${row(index).map(node).join('')}</div></section>`; }).join('')}</div>`;
    talentPanel.querySelectorAll('[data-spend]').forEach(button => button.addEventListener('click', () => {
      const result = talents.spend(healerId, button.dataset.spend); if (result.ok) onTalentsChange(); renderTalents(result.ok ? 'Talent learned.' : result.reason);
    }));
    talentPanel.querySelectorAll('[data-refund]').forEach(button => button.addEventListener('click', () => {
      const result = talents.refund(healerId, button.dataset.refund); if (result.ok) onTalentsChange(); renderTalents(result.ok ? 'Talent point refunded.' : result.reason);
    }));
    talentPanel.querySelector('[data-respec]')?.addEventListener('click', () => {
      const result = talents.respec(healerId); if (result.ok) onTalentsChange(); renderTalents(result.ok ? 'All talent points refunded.' : result.reason);
    });
  }
  buildCards();
  render();
  return { selectHealer(id) { healerId = saveActiveHealer(id); selected = healerId; buildCards(); render(); }, refresh: render };
}
