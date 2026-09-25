export const isLocalDevelopment = hostname => hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === '[::1]';

// UI convenience only, not an access-control boundary. The review page is
// read-only with respect to player saves and uses an in-memory equipment store.
if (typeof document !== 'undefined') {
  const link = document.querySelector('#dev-catalogue-link');
  if (link) link.hidden = !isLocalDevelopment(location.hostname);
  const resetButton = document.querySelector('#dev-reset-button');
  const resetDialog = document.querySelector('#dev-reset-dialog');
  if (resetButton && resetDialog) {
    resetButton.hidden = !isLocalDevelopment(location.hostname);
    resetButton.addEventListener('click', () => {
      document.querySelector('#dev-reset-error').hidden = true;
      resetDialog.showModal();
    });
    document.querySelector('#cancel-dev-reset').addEventListener('click', () => resetDialog.close());
    document.querySelector('#confirm-dev-reset').addEventListener('click', async () => {
      const { clearVesperLocalState } = await import('./hard-reset.js');
      let storage;
      try { storage = localStorage; } catch { storage = null; }
      const result = clearVesperLocalState(storage);
      if (!result.ok) {
        const error = document.querySelector('#dev-reset-error');
        error.textContent = 'Reset could not clear all local Vesper data. The app has not been reloaded.';
        error.hidden = false;
        return;
      }
      location.reload();
    });
  }
}
