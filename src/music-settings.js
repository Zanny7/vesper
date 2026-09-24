export function setupMusicSettings(music, root = document) {
  const volume = root.querySelector('#music-volume');
  const value = root.querySelector('#music-volume-value');
  const mute = root.querySelector('#music-muted');
  if (!volume || !value || !mute) return () => {};

  function render(settings) {
    volume.value = String(settings.volume);
    value.textContent = `${settings.volume}%`;
    mute.checked = settings.muted;
  }

  volume.addEventListener('input', () => music.setVolume(volume.value));
  mute.addEventListener('change', () => music.setMuted(mute.checked));
  return music.subscribe(render);
}
