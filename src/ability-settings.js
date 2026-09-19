import { activeHealer } from './healers.js';

// One binding grammar for capture, saved settings, and encounter input.
// Navigation, pause, cancel, help and browser shortcuts stay available.
export function normalizeBinding(value) {
  if (typeof value !== 'string') return null;
  const parts = value.toUpperCase().split('+');
  const key = parts.pop();
  if (!/^[A-Z0-9]$/.test(key) || parts.some(p => !['CTRL', 'ALT', 'SHIFT'].includes(p)) || new Set(parts).size !== parts.length) return null;
  const modifiers = ['CTRL', 'ALT', 'SHIFT'].filter(p => parts.includes(p));
  if (modifiers.includes('CTRL') && !modifiers.includes('ALT')) return null;
  if (modifiers.includes('ALT') && !modifiers.includes('CTRL')) return null;
  return [...modifiers.map(p => p[0] + p.slice(1).toLowerCase()), key].join('+');
}

export function bindingFromEvent(event) {
  if (event.isComposing || event.metaKey || event.getModifierState?.('AltGraph')) return null;
  // Physical digit keys remain the same when Shift produces punctuation.
  const codeKey = /^(Key[A-Z]|Digit[0-9])$/.test(event.code || '') ? event.code.replace(/^(Key|Digit)/, '') : null;
  const key = codeKey || (event.key?.length === 1 ? event.key : '');
  return normalizeBinding([event.ctrlKey && 'Ctrl', event.altKey && 'Alt', event.shiftKey && 'Shift', key].filter(Boolean).join('+'));
}

export function restoreAbilitySettings(spells, saved) {
  const ids = spells.map(s => s.id), savedOrder = Array.isArray(saved?.order) ? saved.order : [];
  // Keep sections together even if a future class has multiple ability bars.
  const sections = [...new Set(spells.map(s => s.section || 'healing'))];
  const order = sections.flatMap(section => {
    const members = spells.filter(s => (s.section || 'healing') === section).map(s => s.id);
    return [...new Set([...savedOrder.filter(id => members.includes(id)), ...members])];
  });
  const bindings = {}, used = new Set();
  for (const id of ids) {
    const key = normalizeBinding(saved?.bindings?.[id]);
    if (key && !used.has(key)) { bindings[id] = key; used.add(key); }
  }
  for (const spell of spells) if (!bindings[spell.id]) {
    const key = [normalizeBinding(spell.key), ...'1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find(key => key && !used.has(key));
    if (!key) throw new Error('No available default keybind');
    bindings[spell.id] = key; used.add(key);
  }
  return { order, bindings };
}

export function createAbilitySettings(storage) {
  const cache = new Map(), prefix = 'vesper-abilities-v1-';
  function read(healerId) {
    const healer = activeHealer(healerId);
    if (!cache.has(healer.id)) {
      let saved;
      try { saved = JSON.parse(storage?.getItem(prefix + healer.id)); } catch { /* Use defaults. */ }
      cache.set(healer.id, restoreAbilitySettings(healer.combatSpells, saved));
    }
    return cache.get(healer.id);
  }
  function save(healerId, settings) {
    const id = activeHealer(healerId).id;
    cache.set(id, settings);
    try { storage?.setItem(prefix + id, JSON.stringify(settings)); } catch { /* Retain session settings. */ }
  }
  return {
    spells(healerId) {
      const settings = read(healerId), spells = activeHealer(healerId).combatSpells;
      return settings.order.map(id => ({ ...spells.find(s => s.id === id), key: settings.bindings[id] }));
    },
    move(healerId, sourceId, targetId) {
      const spells = activeHealer(healerId).combatSpells;
      const source = spells.find(s => s.id === sourceId), target = spells.find(s => s.id === targetId);
      if (!source || !target || sourceId === targetId || (source.section || 'healing') !== (target.section || 'healing')) return false;
      const settings = read(healerId), order = [...settings.order];
      const destination = order.indexOf(targetId);
      order.splice(order.indexOf(sourceId), 1); order.splice(destination, 0, sourceId);
      save(healerId, { ...settings, order }); return true;
    },
    bind(healerId, spellId, value) {
      const settings = read(healerId), key = normalizeBinding(value);
      if (!settings.order.includes(spellId) || !key) return { ok: false };
      const bindings = { ...settings.bindings }, previous = bindings[spellId];
      const swapped = settings.order.find(id => id !== spellId && bindings[id] === key);
      if (swapped) bindings[swapped] = previous;
      bindings[spellId] = key; save(healerId, { ...settings, bindings });
      return { ok: true, swapped };
    },
  };
}
