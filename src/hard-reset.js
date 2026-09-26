// Keep every player save and persisted setting here so a fresh-save reset is
// deliberate and reviewable when new persistence is added.
export const VESPER_LOCAL_STORAGE_KEYS = Object.freeze([
  'vesper-active-healer-v1',
  'vesper-abilities-v1-priest',
  'vesper-abilities-v1-druid',
  'vesper-abilities-v1-shaman',
  'vesper-campaign-v3',
  'vesper-chapter1-v2', // Legacy campaign migration source.
  'vesper-chapter-runs-v1',
  'vesper-equipment-v2',
  'vesper-equipment-v1', // Legacy equipment migration source.
  'vesper-talents-v1',
  'vesper-view',
  'vesper-music-settings-v1',
  'vesper-encounter-speed',
]);

export function clearVesperLocalState(storage) {
  if (!storage || typeof storage.removeItem !== 'function') {
    return { ok: false, error: new Error('Local storage is unavailable.') };
  }
  try {
    for (const key of VESPER_LOCAL_STORAGE_KEYS) storage.removeItem(key);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
