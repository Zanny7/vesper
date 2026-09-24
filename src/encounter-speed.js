export const ENCOUNTER_SPEEDS = Object.freeze([1, 2, 3, 5]);

const STORAGE_KEY = 'vesper-encounter-speed';

function validSpeed(value) {
  const speed = Number(value);
  return ENCOUNTER_SPEEDS.includes(speed) ? speed : null;
}

export function createEncounterSpeed(storage) {
  let value = 1;
  try {
    value = validSpeed(storage?.getItem(STORAGE_KEY)) ?? 1;
  } catch { /* The 1× default remains available when storage is unavailable. */ }

  return {
    get value() { return value; },
    set(next) {
      const speed = validSpeed(next);
      if (speed === null) return value;
      value = speed;
      try { storage?.setItem(STORAGE_KEY, String(speed)); } catch { /* Keep the choice for this session. */ }
      return value;
    },
  };
}

export function setupEncounterSpeedControl(speed, select = document.querySelector('#encounter-speed')) {
  if (!select) return;
  select.value = String(speed.value);
  select.addEventListener('change', () => speed.set(select.value));
}
