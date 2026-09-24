// Global navigation owns screens and utility panels, never combat mechanics.
export function setupShell({ game, view, resetEncounter, onAbandon = () => {}, onNavigate = () => {}, onEncounterStart = () => {}, onEquipmentShortcut = () => {}, onInventoryOpen = () => {}, onUtilityClose = () => {} }) {
  const screens = {
    home: document.querySelector('#home-view'),
    adventures: document.querySelector('#adventures-view'),
    chapter: document.querySelector('#chapter-view'),
    team: document.querySelector('#team-view'),
    encounter: document.querySelector('#encounter-view'),
  };
  const utilitySurface = document.querySelector('#utility-surface');
  const utilityButtons = [...document.querySelectorAll('[data-utility]')];
  const restrictedUtilities = new Set(['inventory', 'equipment']);
  const inventoryContent = document.querySelector('#inventory-content');
  const musicSettings = document.querySelector('#music-settings');
  const navigation = [...document.querySelectorAll('.primary-nav [data-navigate]')];
  const leaveDialog = document.querySelector('#leave-encounter');
  let current = 'home';
  let utility = null;
  let pendingNavigation = null;

  const activeEncounter = () => current === 'encounter' && ['running', 'paused'].includes(game.status);

  function closeUtility() {
    if (utility) onUtilityClose();
    utility = null;
    utilitySurface.hidden = true;
    for (const button of utilityButtons) button.setAttribute('aria-expanded', 'false');
  }

  function refresh() {
    const locked = activeEncounter();
    if (locked && restrictedUtilities.has(utility)) closeUtility();
    for (const button of utilityButtons) {
      const restricted = restrictedUtilities.has(button.dataset.utility);
      button.disabled = locked && restricted;
      const name = button.dataset.utility[0].toUpperCase() + button.dataset.utility.slice(1);
      button.title = `${name}${locked && restricted ? ' — unavailable during an encounter' : ''}`;
    }
  }

  function navigate(destination, focus = true) {
    closeUtility();
    current = destination;
    document.body.dataset.screen = destination;
    for (const [name, screen] of Object.entries(screens)) screen.hidden = name !== destination;
    for (const button of navigation) {
      if (button.dataset.navigate === destination || (destination === 'chapter' && button.dataset.navigate === 'adventures')) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
    view.setEncounterVisible(destination === 'encounter');
    refresh();
    onNavigate(destination);
    if (focus) {
      const target = destination === 'encounter' ? document.querySelector('#begin') : screens[destination].querySelector('h1');
      target.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }

  function requestNavigation(destination) {
    if (activeEncounter()) {
      pendingNavigation = destination;
      leaveDialog.showModal();
      return;
    }
    if (current === 'encounter') resetEncounter();
    navigate(destination);
  }

  for (const button of document.querySelectorAll('[data-navigate]')) {
    button.addEventListener('click', () => requestNavigation(button.dataset.navigate));
  }
  // The brand is always the route back to the introductory Home screen.
  document.querySelector('.brand').addEventListener('click', event => {
    event.preventDefault();
    requestNavigation('home');
  });
  document.querySelector('#stay-encounter').addEventListener('click', () => leaveDialog.close());
  leaveDialog.addEventListener('close', () => {
    pendingNavigation = null;
  });
  document.querySelector('#confirm-leave').addEventListener('click', () => {
    const destination = pendingNavigation;
    pendingNavigation = null;
    leaveDialog.close();
    onAbandon();
    resetEncounter();
    navigate(destination);
  });
  for (const button of utilityButtons) {
    button.addEventListener('click', () => {
      const next = button.dataset.utility;
      if (activeEncounter() && restrictedUtilities.has(next)) return;
      if (next === 'equipment') { onEquipmentShortcut(); requestNavigation('team'); return; }
      if (utility === next) return closeUtility();
      closeUtility();
      utility = next;
      const name = next === 'settings' ? 'Settings' : next === 'inventory' ? 'Inventory' : 'Equipment';
      document.querySelector('#utility-title').textContent = name;
      document.querySelector('#utility-description').hidden = true;
      inventoryContent.hidden = next !== 'inventory';
      musicSettings.hidden = next !== 'settings';
      if (next === 'inventory') onInventoryOpen();
      utilitySurface.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      document.querySelector('#utility-title').focus({ preventScroll: true });
    });
  }
  document.querySelector('#close-utility').addEventListener('click', () => {
    const button = utilityButtons.find(button => button.dataset.utility === utility);
    closeUtility();
    button?.focus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && utility) {
      const button = utilityButtons.find(button => button.dataset.utility === utility);
      closeUtility(); button?.focus();
      event.stopImmediatePropagation();
    }
  }, true);
  navigate('home', false);
  return { refresh, isEncounter: () => current === 'encounter', enterEncounter(encounter, resources, track) {
    resetEncounter(encounter, resources);
    navigate('encounter', false);
    onEncounterStart(track, encounter, resources);
    game.start();
    refresh();
    document.querySelector('#view-toggle').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, openChapter() { navigate('chapter'); } };
}
