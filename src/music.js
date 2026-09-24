const SETTINGS_KEY = 'vesper-music-settings-v1';
const DEFAULT_VOLUME = 25;

function localStorageOrNull() {
  try { return localStorage; } catch { return null; }
}

function clampVolume(value) {
  const volume = Number(value);
  return Number.isFinite(volume) ? Math.round(Math.max(0, Math.min(100, volume))) : DEFAULT_VOLUME;
}

export function restoreMusicSettings(value) {
  let settings = value;
  if (typeof value === 'string') {
    try { settings = JSON.parse(value); } catch { settings = null; }
  }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return { volume: DEFAULT_VOLUME, muted: false };
  return {
    volume: clampVolume(settings.volume),
    muted: typeof settings.muted === 'boolean' ? settings.muted : false,
  };
}

function normalizeTrack(track) {
  if (typeof track === 'string') return { id: track, src: track };
  if (!track || typeof track !== 'object') return null;
  const src = track.src || track.path || track.file || track.url;
  if (typeof src !== 'string' || !src.trim()) return null;
  const id = track.id || track.trackId || src;
  return { id: String(id), src };
}

export function createMusicController({ storage = localStorageOrNull(), AudioClass = typeof Audio === 'function' ? Audio : null, settingsKey = SETTINGS_KEY, fadeDuration = 380, fadeInDuration = 280 } = {}) {
  let settings = { volume: DEFAULT_VOLUME, muted: false };
  try { settings = restoreMusicSettings(storage?.getItem(settingsKey)); } catch { /* Audio preferences remain available for this session. */ }

  const subscribers = new Set();
  let audio = null;
  let currentTrackId = null;
  let currentSource = null;
  let fadeTimer = null;
  let fadeState = null;

  function state() {
    return { ...settings, currentTrackId, playing: Boolean(audio && !audio.paused) };
  }

  function notify() {
    const snapshot = state();
    for (const subscriber of subscribers) {
      try { subscriber(snapshot); } catch { /* A settings view cannot interrupt playback. */ }
    }
  }

  function saveSettings() {
    try { storage?.setItem(settingsKey, JSON.stringify(settings)); } catch { /* Audio preferences remain available for this session. */ }
  }

  function effectiveVolume() {
    return settings.muted ? 0 : settings.volume / 100;
  }

  function cancelFade() {
    if (fadeTimer !== null) clearInterval(fadeTimer);
    fadeTimer = null;
    fadeState = null;
  }

  function ensureAudio() {
    if (audio) return audio;
    if (typeof AudioClass !== 'function') return null;
    try {
      audio = new AudioClass();
      audio.loop = true;
      audio.preload = 'none';
    } catch { audio = null; }
    return audio;
  }

  function fadeTo(target, duration, kind, onComplete) {
    cancelFade();
    if (!audio) { onComplete?.(); return; }
    const length = Math.max(0, Number(duration) || 0);
    if (length === 0) {
      audio.volume = target;
      onComplete?.();
      return;
    }
    fadeState = { from: audio.volume, to: target, startedAt: Date.now(), duration: length, kind, onComplete };
    fadeTimer = setInterval(() => {
      if (!fadeState || !audio) return;
      const progress = Math.min(1, (Date.now() - fadeState.startedAt) / fadeState.duration);
      audio.volume = Math.max(0, Math.min(1, fadeState.from + (fadeState.to - fadeState.from) * progress));
      if (progress >= 1) {
        const finish = fadeState.onComplete;
        cancelFade();
        finish?.();
      }
    }, 25);
  }

  function releaseAudio() {
    if (audio) {
      try { audio.pause(); } catch { /* Continue clearing local playback state. */ }
      try { audio.currentTime = 0; } catch { /* Some media elements reject seeking before metadata loads. */ }
      try { audio.removeAttribute?.('src'); audio.load?.(); } catch { /* A missing media source is already stopped. */ }
      audio.volume = effectiveVolume();
    }
    currentTrackId = null;
    currentSource = null;
    notify();
  }

  function setPreference(name, value) {
    settings = name === 'volume'
      ? { ...settings, volume: clampVolume(value) }
      : { ...settings, muted: Boolean(value) };
    saveSettings();
    if (audio) {
      if (fadeState?.kind === 'out') {
        fadeState.from = effectiveVolume();
        fadeState.startedAt = Date.now();
        audio.volume = fadeState.from;
      } else {
        cancelFade();
        audio.volume = effectiveVolume();
      }
    }
    notify();
  }

  function play(track) {
    const selected = normalizeTrack(track);
    if (!selected) {
      stop({ fade: false });
      return false;
    }
    const player = ensureAudio();
    if (!player) {
      currentTrackId = selected.id;
      currentSource = selected.src;
      notify();
      return false;
    }

    if (currentTrackId === selected.id && currentSource === selected.src) {
      cancelFade();
      player.loop = true;
      player.volume = effectiveVolume();
      if (player.paused) {
        try { player.play()?.catch?.(() => {}); } catch { /* Blocked playback never interrupts encounter startup. */ }
      }
      notify();
      return true;
    }

    cancelFade();
    try { player.pause(); } catch { /* Replacing the source below still releases the old track. */ }
    currentTrackId = selected.id;
    currentSource = selected.src;
    try {
      player.loop = true;
      player.src = selected.src;
      player.currentTime = 0;
      player.volume = 0;
      player.load?.();
      const result = player.play();
      result?.catch?.(() => {});
      fadeTo(effectiveVolume(), fadeInDuration, 'in');
      notify();
      return true;
    } catch {
      releaseAudio();
      return false;
    }
  }

  function stop({ fade = true, duration = fadeDuration } = {}) {
    if (fade && fadeState?.kind === 'out') return;
    cancelFade();
    if (!audio) {
      currentTrackId = null;
      currentSource = null;
      notify();
      return;
    }
    const finish = releaseAudio;
    if (fade && !audio.paused && audio.volume > 0) fadeTo(0, duration, 'out', finish);
    else finish();
  }

  return {
    play,
    transition: play,
    stop,
    fade(duration = fadeDuration) { stop({ fade: true, duration }); },
    setVolume(value) { setPreference('volume', value); },
    setMuted(value) { setPreference('muted', value); },
    getSettings() { return { ...settings }; },
    getState: state,
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      subscribers.add(listener);
      listener(state());
      return () => subscribers.delete(listener);
    },
  };
}
