const track = definition => Object.freeze({ ...definition, pools: Object.freeze(definition.pools) });

export const SOUNDTRACK_MANIFEST = Object.freeze([
  track({ id: 'ashen-vigil', title: 'Ashen Vigil', src: '/assets/music/ashen-vigil.mp3', bpm: 76, mood: 'Dark, calm, and hypnotic; the general encounter theme.', pools: ['normal'] }),
  track({ id: 'veil-of-embers', title: 'Veil of Embers', src: '/assets/music/veil-of-embers.mp3', bpm: 84, mood: 'Warm and melodic, with a restrained pulse for early encounters.', pools: ['normal'] }),
  track({ id: 'hollow-constellation', title: 'Hollow Constellation', src: '/assets/music/hollow-constellation.mp3', bpm: 72, mood: 'Spacious, mysterious, and gently magical.', pools: ['normal'] }),
  track({ id: 'blood-in-the-quiet', title: 'Blood in the Quiet', src: '/assets/music/blood-in-the-quiet.mp3', bpm: 90, mood: 'Tense and dark for dangerous or high-pressure encounters.', pools: ['normal'] }),
  track({ id: 'the-last-lantern', title: 'The Last Lantern', src: '/assets/music/the-last-lantern.mp3', bpm: 80, mood: 'Melancholy, with a stronger but still restrained melody.', pools: ['normal'] }),
  track({ id: 'beneath-the-vesper', title: 'Beneath the Vesper', src: '/assets/music/beneath-the-vesper.mp3', bpm: 96, mood: 'The darkest, heaviest initial track, reserved for chapter bosses.', pools: ['boss'] }),
]);

export const SOUNDTRACK_POOLS = Object.freeze({
  normal: Object.freeze(SOUNDTRACK_MANIFEST.filter(item => item.pools.includes('normal'))),
  boss: Object.freeze(SOUNDTRACK_MANIFEST.filter(item => item.pools.includes('boss'))),
});

export function createEncounterTrackSelector({ random = Math.random } = {}) {
  let lastTrackId = null;

  return {
    select(encounter) {
      if (!encounter || typeof encounter !== 'object') return null;
      const poolName = encounter.kind === 'boss' || encounter.isBoss === true ? 'boss' : 'normal';
      const eligible = SOUNDTRACK_POOLS[poolName];
      if (!eligible.length) return null;

      let candidates = eligible;
      if (poolName === 'normal' && eligible.length > 1 && lastTrackId) {
        const alternatives = eligible.filter(item => item.id !== lastTrackId);
        if (alternatives.length) candidates = alternatives;
      }

      let roll = 0;
      try {
        const value = Number(random());
        if (Number.isFinite(value)) roll = Math.max(0, Math.min(1 - Number.EPSILON, value));
      } catch { /* Use the first eligible track if a custom random source fails. */ }
      const selected = candidates[Math.floor(roll * candidates.length)];
      lastTrackId = selected.id;
      return selected;
    },
    resetHistory() { lastTrackId = null; },
    get previousTrackId() { return lastTrackId; },
  };
}
