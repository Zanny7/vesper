const displayNumber = value => Math.round(value).toLocaleString('en-US');
const rate = (amount, seconds) => seconds > 0 ? amount / seconds : 0;
export const contributionPercent = (amount, total) => total > 0 ? `${Math.round(amount / total * 100)}%` : '—';
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
    this.totalOverheal = 0;
  }

  constructor(party) { this.reset(party); }

  consume(events) {
    for (const event of events) {
      if (event.type === 'damage' && event.target === 'boss' && this.damage.has(event.actor) && event.amount > 0) {
        this.damage.set(event.actor, this.damage.get(event.actor) + event.amount);
        this.totalDamage += event.amount;
      }
      if (event.type === 'heal') {
        this.totalOverheal += Math.max(0, (event.raw ?? event.amount) - event.amount);
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
  let mode = 'damage', detail = false, previousBody = '', previousPinned = '';
  const summary = (label, total, seconds, unit) => `<div class="meter-summary"><span>${label}</span><strong>${displayNumber(total)}</strong><small>${displayNumber(rate(total, seconds))} ${unit}</small></div>`;
  const overhealSummary = () => `<div class="meter-summary"><span>OVERHEALING</span><strong>${displayNumber(meter.totalOverheal)}</strong><small>${contributionPercent(meter.totalOverheal, meter.totalHealing + meter.totalOverheal)} of attempted healing</small></div>`;
  const row = (name, amount, perSecond, color, portion, clickable = false, share = null) => {
    const unit = mode === 'damage' ? 'damage' : 'healing';
    return `<${clickable ? 'button type="button" data-meter-back="true"' : 'div'} class="meter-row" style="--meter-color:${escapeHtml(color)};--meter-fill:${Math.max(0, Math.min(100, portion))}%"><span class="meter-fill" aria-hidden="true"></span><span class="meter-name">${escapeHtml(name)}</span><span class="meter-share">${share ?? '—'}</span><strong aria-label="${displayNumber(perSecond)} ${unit} per second, ${displayNumber(amount)} total ${unit}">(${displayNumber(perSecond)}) ${displayNumber(amount)}</strong></${clickable ? 'button' : 'div'}>`;
  };

  function render() {
    const seconds = game.time;
    element.querySelectorAll('[data-meter-mode]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.meterMode === mode));
    });
    const body = element.querySelector('.meter-body');
    const pinned = element.querySelector('.meter-pinned');
    let bodyMarkup, pinnedMarkup;
    if (mode === 'damage') {
      const rows = meter.damageRows(seconds);
      bodyMarkup = rows.map(member => row(member.name, member.amount, member.perSecond, member.color, rows[0].amount ? member.amount / rows[0].amount * 100 : 0, false, contributionPercent(member.amount, meter.totalDamage))).join('');
      pinnedMarkup = summary('PARTY TOTAL', meter.totalDamage, seconds, 'DPS');
    } else if (detail) {
      const rows = meter.healingRows(seconds, game.spells);
      bodyMarkup = `${rows.length ? rows.map(effect => row(effect.name, effect.amount, effect.perSecond, '#86cbb3', rows[0].amount ? effect.amount / rows[0].amount * 100 : 0, true, contributionPercent(effect.amount, meter.totalHealing))).join('') : '<p class="meter-empty">No effective healing yet.</p>'}<button type="button" class="meter-back" data-meter-back="true">← All healing</button>`;
      pinnedMarkup = overhealSummary();
    } else {
      bodyMarkup = `${row(game.healer?.name || 'Healer', meter.totalHealing, rate(meter.totalHealing, seconds), '#86cbb3', meter.totalHealing ? 100 : 0, true, contributionPercent(meter.totalHealing, meter.totalHealing))}<p class="meter-hint">Select the healer to see spells and effects.</p>`;
      pinnedMarkup = overhealSummary();
    }
    if (bodyMarkup !== previousBody) {
      const focusedBack = body.contains(document.activeElement) && document.activeElement.hasAttribute('data-meter-back');
      body.innerHTML = bodyMarkup;
      if (focusedBack) body.querySelector('[data-meter-back]')?.focus({ preventScroll: true });
      previousBody = bodyMarkup;
    }
    if (pinnedMarkup !== previousPinned) { pinned.innerHTML = pinnedMarkup; previousPinned = pinnedMarkup; }
  }

  element.addEventListener('click', event => {
    const modeButton = event.target.closest('[data-meter-mode]');
    if (modeButton) { mode = modeButton.dataset.meterMode; detail = false; previousBody = ''; previousPinned = ''; render(); return; }
    if (event.target.closest('[data-meter-back]')) { detail = mode === 'healing' && !detail; previousBody = ''; render(); }
  });
  return {
    reset() { meter.reset(game.party); mode = 'damage'; detail = false; previousBody = ''; previousPinned = ''; render(); },
    consume(events) { meter.consume(events); },
    render,
  };
}
