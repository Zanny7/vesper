// Presentation helpers; these do not alter bindings or combat timing.
export function compactKeybind(binding) {
  const aliases = { shift: 'S', ctrl: 'C', control: 'C', alt: 'A', option: 'A', meta: 'M', cmd: 'M', command: 'M', win: 'M', super: 'M' };
  const parts = binding.split('+').map(part => part.trim());
  const key = parts.pop().toUpperCase();
  return parts.map(part => aliases[part.toLowerCase()] || part.toUpperCase()).join('') + key;
}

export function formatCooldown(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const tenths = Math.max(1, Math.round(seconds * 10));
  if (seconds < 60) return String(Math.min(599, tenths) / 10);
  // Round to the nearest second after the one-minute display boundary.
  const total = Math.round(tenths / 10);
  return `${Math.floor(total / 60)}.${String(total % 60).padStart(2, '0')}`;
}
