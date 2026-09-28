const displayNumber = value => Math.round(value).toLocaleString('en-US');
const rate = (amount, seconds) => seconds > 0 ? amount / seconds : 0;
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

export class EncounterMeter {
  reset(party) {
    this.party = party.map(({ id, name, color }) => ({ id, name, color }));
    this.damage = new Map(this.party.map(member => [member.id, 0]));
    this.healing = new Map();
    this.totalDamage = 0;
    this.totalHealing = 0;
  }

  constructor(party) { this.reset(party); }

  consume(events) {
    for (const event of events) {
      if (event.type === 'damage' && event.target === 'boss' && this.damage.has(event.actor) && event.amount > 0) {
        this.damage.set(event.actor, this.damage.get(event.actor) + event.amount);
        this.totalDamage += event.amount;
      }
      if (event.type === 'heal' && event.amount > 0) {
        const source = event.spell || 'unknown';
        this.healing.set(source, (this.healing.get(source) || 0) + event.amount);
        this.totalHealing += event.amount;
      }
    }
  }

  damageRows(seconds) {
    return this.party.map((member, index) => ({ ...member, amount: this.damage.get(member.id), perSecond: rate(this.damage.get(member.id), seconds), index }))
      .sort((a, b) => b.amount - a.amount || a.index - b.index);
  }

  healingRows(seconds, spells = []) {
    const names = new Map(spells.map(spell => [spell.id, spell.name]));
    return [...this.healing].map(([source, amount]) => ({
      source, name: names.get(source) || source.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      amount, perSecond: rate(amount, seconds),
    })).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  }
}

export function setupEncounterMeter(element, game) {
  const meter = new EncounterMeter(game.party);
  let mode = 'damage', detail = false, previousMarkup = '';
  const summary = (label, total, seconds, unit) => `<div class="meter-summary"><span>${label}</span><strong>${displayNumber(total)}</strong><small>${displayNumber(rate(total, seconds))} ${unit}</small></div>`;
  const row = (name, amount, perSecond, color, portion, clickable = false) => `<${clickable ? 'button type="button" data-meter-back="true"' : 'div'} class="meter-row" style="--meter-color:${escapeHtml(color)};--meter-fill:${Math.max(0, Math.min(100, portion))}%"><span class="meter-fill" aria-hidden="true"></span><span class="meter-name">${escapeHtml(name)}</span><strong>${displayNumber(amount)}</strong><small>${displayNumber(perSecond)} ${mode === 'damage' ? 'DPS' : 'HPS'}</small></${clickable ? 'button' : 'div'}>`;

  function render() {
    const seconds = game.time;
    element.querySelectorAll('[data-meter-mode]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.meterMode === mode));
    });
    const body = element.querySelector('.meter-body');
    let markup;
    if (mode === 'damage') {
      const rows = meter.damageRows(seconds);
      markup = `${rows.map(member => row(member.name, member.amount, member.perSecond, member.color, rows[0].amount ? member.amount / rows[0].amount * 100 : 0)).join('')}${summary('PARTY TOTAL', meter.totalDamage, seconds, 'DPS')}`;
    } else if (detail) {
      const rows = meter.healingRows(seconds, game.spells);
      markup = `<button type="button" class="meter-back" data-meter-back="true">← All healing</button>${rows.length ? rows.map(effect => row(effect.name, effect.amount, effect.perSecond, '#86cbb3', effect.amount / rows[0].amount * 100, true)).join('') : '<p class="meter-empty">No effective healing yet.</p>'}${summary('EFFECTIVE HEALING', meter.totalHealing, seconds, 'HPS')}`;
    } else {
      markup = `${row(game.healer?.name || 'Healer', meter.totalHealing, rate(meter.totalHealing, seconds), '#86cbb3', meter.totalHealing ? 100 : 0, true)}${summary('EFFECTIVE HEALING', meter.totalHealing, seconds, 'HPS')}<p class="meter-hint">Select the healer to see spells and effects.</p>`;
    }
    if (markup !== previousMarkup) {
      const focusedBack = body.contains(document.activeElement) && document.activeElement.hasAttribute('data-meter-back');
      body.innerHTML = markup;
      if (focusedBack) body.querySelector('[data-meter-back]')?.focus({ preventScroll: true });
      previousMarkup = markup;
    }
  }

  element.addEventListener('click', event => {
    const modeButton = event.target.closest('[data-meter-mode]');
    if (modeButton) { mode = modeButton.dataset.meterMode; detail = false; previousMarkup = ''; render(); return; }
    if (event.target.closest('[data-meter-back]')) { detail = mode === 'healing' && !detail; previousMarkup = ''; render(); }
  });
  return {
    reset() { meter.reset(game.party); mode = 'damage'; detail = false; previousMarkup = ''; render(); },
    consume(events) { meter.consume(events); },
    render,
  };
}
