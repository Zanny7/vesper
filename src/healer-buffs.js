import { effectGlyph } from './ability-icons.js';

const DEFINITIONS = {
  postHaste: {
    name: 'Post-Haste', icon: 'bolts', color: '#f0cf82',
    effect: 'Each stack empowers one Greater Heal or Prayer of Healing cast, reducing its cast time and Mana cost by 20%.',
    reservedStacks: game => game.cast?.postHaste ? 1 : 0,
    present: (value, time, { reservedStacks }) => ({
      stacks: value,
      reserved: reservedStacks,
      remaining: null,
    }),
  },
  divineFervor: {
    name: 'Divine Fervor', icon: 'wings', color: '#9ed8b3',
    effect: value => `Increases your casting speed by ${Math.round(value.speed * 100)}%.`,
    present: (value, time) => ({ remaining: Math.max(0, value.expires - time) }),
  },
};

export function healerBuffs(game) {
  return Object.entries(DEFINITIONS).flatMap(([id, definition]) => {
    const value = game.buffs[id];
    const reservedStacks = definition.reservedStacks?.(game) || 0;
    if ((!value && !reservedStacks) || (value?.target && value.target !== game.healer?.id)) return [];
    const state = definition.present(value || 0, game.time, { game, reservedStacks });
    if (state.remaining !== null && state.remaining <= 0) return [];
    const effect = typeof definition.effect === 'function' ? definition.effect(value) : definition.effect;
    return [{ id, ...definition, ...state, effect }];
  });
}

export function renderHealerBuffs(root, game) {
  const buffs = healerBuffs(game);
  const key = buffs.map(buff => `${buff.id}:${buff.stacks || ''}:${buff.reserved || ''}:${buff.remaining === null ? '' : Math.ceil(buff.remaining)}`).join('|');
  root.hidden = buffs.length === 0;
  if (root.dataset.buffKey === key) return;
  root.dataset.buffKey = key;
  root.innerHTML = buffs.map(buff => {
    const duration = buff.remaining === null ? '' : `\n${buff.remaining.toFixed(1)}s remaining`;
    const totalStacks = (buff.stacks || 0) + (buff.reserved || 0);
    const stacks = buff.stacks || buff.reserved
      ? `\n${buff.stacks || 0} available${buff.reserved ? `; ${buff.reserved} reserved for ${game.cast.spell.name}` : ''}`
      : '';
    const stackLabel = buff.stacks || buff.reserved
      ? ` ${totalStacks} stack${totalStacks === 1 ? '' : 's'} active; ${buff.stacks || 0} available${buff.reserved ? `, ${buff.reserved} reserved for ${game.cast.spell.name}` : ''}.`
      : '';
    return `<div class="healer-buff" tabindex="0" data-buff="${buff.id}" data-tooltip="${buff.name}\n${buff.effect}${stacks}${duration}" aria-label="${buff.name}. ${buff.effect}${stackLabel}${buff.remaining === null ? '' : ` ${buff.remaining.toFixed(1)} seconds remaining.`}">${effectGlyph(buff)}${totalStacks ? `<strong class="buff-stacks">${totalStacks}</strong>` : ''}${buff.remaining === null ? '' : `<span class="buff-duration">${Math.ceil(buff.remaining)}s</span>`}</div>`;
  }).join('');
}
