// BAT-87: healing-only policy. Same decision cadence and injury thresholds as
// the existing Priest/Druid policy; account for healing already banked.
import { CONFIG } from '../src/data.js';
export function decideShaman(game, skill = 'veryGood') {
  if (game.cast || game.status !== 'running') return;
  const threshold = value => value * ({ veryGood: 1, average: .85, weak: .75 }[skill] ?? 1);
  const living = game.party.filter(p => p.hp > 0);
  const missing = p => p.maxHp - p.hp;
  const ordered = [...living].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  const lowest = ordered[0], tank = game.party[0];
  if (!lowest) return;
  const hurt = living.filter(p => missing(p) >= threshold(65));
  const spell = id => game.spells.find(s => s.id === id);
  const cast = (id, target = lowest) => game.begin(id, target.id).ok;
  const hot = (p, id) => game.activeHots(p, [id])[0];
  const pendingSoon = p => game.activeHots(p, ['riptide', 'recurringSurge'])
    .reduce((sum, h) => sum + (h.bankedHealing ? h.bankedHealing.slice(0, 2).reduce((a, b) => a + b, 0)
      : h.heal * Math.min(h.ticks, Math.floor(4 / h.interval))), 0)
    + (game.tideTotem ? game.tideTotem.heal * Math.min(4, game.tideTotem.ticks) : 0);
  const danger = lowest.hp / lowest.maxHp < .45;
  // Tide is useful on two-target pressure and sustained tank recovery too.
  // Estimate useful ticks from visible injuries and two normal tank strikes;
  // a three-target-only trigger omitted this capstone on most real routes.
  const tide = spell('healingTide');
  if (tide && !game.tideTotem) {
    const profile = game.resolveSpell(tide).totem;
    const useful = living.reduce((sum, p) => sum + Math.min(Math.max(0, missing(p) - pendingSoon(p))
      + (p === tank && missing(p) >= threshold(90) ? game.encounter.strike.damage * 2 : 0), profile.tick * profile.ticks), 0);
    if (useful >= threshold(tide.cost * CONFIG.baseMana * 3) && cast('healingTide')) return;
  }
  // Unleash is a wound/burst response, never repeatedly overwrite stored stacks.
  if (!game.buffs.unleashLife && (missing(lowest) >= threshold(110) || hurt.length >= 3) && cast('unleashLife')) return;
  const uncovered = living.reduce((sum, p) => sum + Math.max(0, missing(p) - pendingSoon(p)), 0);
  if (!game.totem && (!game.tideTotem || uncovered >= threshold(70))
    && (hurt.length >= 2 || missing(tank) >= threshold(70)) && cast('healingStream')) return;
  // Use a split Wave before an instant Riptide consumes the primary wound.
  // The secondary need can be below the generic 65-Health group threshold.
  if (spell('healingWave').ancestralEcho && !danger) {
    const wave = spell('healingWave');
    const choices = living.map(primary => {
      const secondary = ordered.find(p => p !== primary && missing(p) > 0);
      const need = Math.max(0, missing(primary) - pendingSoon(primary));
      const secondNeed = secondary ? Math.max(0, missing(secondary) - pendingSoon(secondary)) : 0;
      const effective = Math.min(game.resolveSpell(wave, primary).direct, need);
      return { primary, need, secondNeed, useful: effective + Math.min(effective * wave.ancestralEcho, secondNeed) };
    }).filter(c => c.need >= threshold(85) && c.secondNeed >= threshold(40)).sort((a, b) => b.useful - a.useful);
    if (choices.length && cast('healingWave', choices[0].primary)) return;
  }
  const riptide = hot(lowest, 'riptide');
  const cashout = spell('riptide').flowingRiptide && riptide
    && missing(lowest) >= threshold(40 + riptide.heal * riptide.ticks) && riptide.heal * riptide.ticks >= 65;
  const tideCovers = game.tideTotem && !danger && missing(lowest)
    + (lowest === tank ? game.encounter.strike.damage : 0) <= pendingSoon(lowest);
  if (!tideCovers && missing(lowest) >= threshold(65) && (!riptide || riptide.expires - game.time < 3 || cashout) && cast('riptide')) return;
  const groupNeed = living.reduce((sum, p) => sum + Math.max(0, missing(p) - pendingSoon(p)), 0);
  if (hurt.length >= 3 && groupNeed >= threshold(210) && cast('chainHeal')) return;
  // Bank ahead of the next tank strikes, but do not keep filling the 18s cap
  // or pay for Surge when Earthliving will install it with the filler cast.
  const surge = hot(tank, 'recurringSurge');
  const surgeSpell = game.resolveSpell(spell('recurringSurge'));
  const waveSpell = game.resolveSpell(spell('healingWave'));
  const surgeEfficient = surgeSpell.hot.tick * surgeSpell.hot.ticks / surgeSpell.cost >= waveSpell.direct / waveSpell.cost;
  if (tank.hp > 0 && surgeEfficient && !spell('healingWave').earthlivingDuration && !danger
    && (!game.tideTotem || missing(tank) + game.encounter.strike.damage * 1.5 > pendingSoon(tank))
    && missing(tank) >= threshold(45) && (!surge || surge.expires - game.time < 4)
    && cast('recurringSurge', tank)) return;
  const incoming = lowest.id === 'tank' ? game.encounter.strike.damage * 1.5 : 30;
  if (missing(lowest) >= threshold(85) && (danger || missing(lowest) + incoming - pendingSoon(lowest) >= threshold(95))) cast('healingWave');
}

const sustain = { 'tidal-reserves': 2, 'deep-riptide': 2 };
const waves = { ...sustain, 'tidal-waves': 1, 'restorative-stream': 1 };
const flow = { ...waves, 'flowing-riptide': 1 };
export const shamanBuilds = {
  '0-base': {},
  '1-reserves': { 'tidal-reserves': 1 },
  '1-deep': { 'deep-riptide': 1 },
  '1-momentum': { 'tidal-momentum': 1 },
  '3-deep': { 'tidal-reserves': 2, 'deep-riptide': 1 },
  '3-momentum': { 'tidal-reserves': 2, 'tidal-momentum': 1 },
  '3-waves': { 'tidal-reserves': 2, 'tidal-waves': 1 },
  '3-tide': { 'tidal-reserves': 2, 'high-tide': 1 },
  '3-stream': { 'tidal-reserves': 2, 'restorative-stream': 1 },
  '5-waves': { ...sustain, 'tidal-waves': 1 },
  '5-tide': { ...sustain, 'high-tide': 1 },
  '5-stream': { ...sustain, 'restorative-stream': 1 },
  '5-flow': { 'tidal-reserves': 2, 'deep-riptide': 1, 'tidal-waves': 1, 'flowing-riptide': 1 },
  '5-echo': { 'tidal-reserves': 2, 'tidal-momentum': 1, 'tidal-waves': 1, 'echoing-surge': 1 },
  '5-double': { 'tidal-reserves': 2, 'tidal-momentum': 1, 'tidal-waves': 1, 'double-current': 1 },
  '7-flow': flow,
  '7-echo': { ...waves, 'echoing-surge': 1 },
  '7-double': { ...waves, 'double-current': 1 },
  '7-earth': { ...waves, earthliving: 1 },
  '7-tide': { ...waves, 'healing-tide-totem': 1 },
  '7-ancestral': { ...waves, 'ancestral-echo': 1 },
  '7-ancestral-wave': { 'tidal-reserves': 2, 'tidal-momentum': 2, 'tidal-waves': 1, 'high-tide': 1, 'ancestral-echo': 1 },
  '7-earth-echo': { 'tidal-reserves': 2, 'deep-riptide': 1, 'tidal-waves': 1, 'restorative-stream': 1, 'echoing-surge': 1, earthliving: 1 },
  '7-tide-echo': { 'tidal-reserves': 2, 'deep-riptide': 1, 'tidal-waves': 1, 'restorative-stream': 1, 'echoing-surge': 1, 'healing-tide-totem': 1 },
  '7-ancestral-echo': { 'tidal-reserves': 2, 'deep-riptide': 1, 'tidal-waves': 1, 'restorative-stream': 1, 'echoing-surge': 1, 'ancestral-echo': 1 },
  '7-high-tide': { ...sustain, 'high-tide': 2, 'flowing-riptide': 1 },
  '7-stream': { ...sustain, 'restorative-stream': 2, 'flowing-riptide': 1 },
  '7-momentum': { 'tidal-reserves': 2, 'tidal-momentum': 2, 'tidal-waves': 1, 'restorative-stream': 1, earthliving: 1 },
  '8-earth': { ...flow, earthliving: 1 },
  '8-tide': { ...flow, 'healing-tide-totem': 1 },
  '8-ancestral': { ...flow, 'ancestral-echo': 1 },
  '8-ancestral-double': { 'tidal-reserves': 2, 'tidal-momentum': 2, 'tidal-waves': 1, 'high-tide': 1, 'double-current': 1, 'ancestral-echo': 1 },
  '8-earth-echo': { ...waves, 'echoing-surge': 1, earthliving: 1 },
  '8-earth-double': { ...waves, 'double-current': 1, earthliving: 1 },
  '8-earth-tide': { ...waves, earthliving: 1, 'healing-tide-totem': 1 },
  '8-earth-ancestral': { ...waves, earthliving: 1, 'ancestral-echo': 1 },
};
