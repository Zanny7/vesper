// Global navigation owns screens and utility panels, never combat mechanics.
export function setupShell({ game, view, resetEncounter, onAbandon = () => {}, onNavigate = () => {} }) {
  const screens = {
    home: document.querySelector('#home-view'),
    adventures: document.querySelector('#adventures-view'),
    chapter: document.querySelector('#chapter-view'),
    team: document.querySelector('#team-view'),
    encounter: document.querySelector('#encounter-view'),
  };
  const utilitySurface = document.querySelector('#utility-surface');
  const equipmentContent = document.querySelector('#equipment-content');
  const utilityDescription = document.querySelector('#utility-description');
  const utilityButtons = [...document.querySelectorAll('[data-utility]')];
  const navigation = [...document.querySelectorAll('.primary-nav [data-navigate]')];
  const leaveDialog = document.querySelector('#leave-encounter');
  let current = 'home';
  let utility = null;
  let pendingNavigation = null;
  let resumeOnCancel = false;

  const activeEncounter = () => current === 'encounter' && ['running', 'paused'].includes(game.status);

  function closeUtility() {
    utility = null;
    utilitySurface.hidden = true;
    for (const button of utilityButtons) button.setAttribute('aria-expanded', 'false');
  }

  function refresh() {
    const locked = activeEncounter();
    if (locked) closeUtility();
    for (const button of utilityButtons) {
      button.disabled = locked;
      button.title = `${button.dataset.utility === 'inventory' ? 'Inventory' : 'Equipment'}${locked ? ' — unavailable during an encounter' : ''}`;
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
      resumeOnCancel = game.status === 'running';
      if (resumeOnCancel) game.pause();
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
    if (pendingNavigation && resumeOnCancel && game.status === 'paused') game.pause();
    pendingNavigation = null;
    resumeOnCancel = false;
  });
  document.querySelector('#confirm-leave').addEventListener('click', () => {
    const destination = pendingNavigation;
    pendingNavigation = null;
    resumeOnCancel = false;
    leaveDialog.close();
    onAbandon();
    resetEncounter();
    navigate(destination);
  });
  for (const button of utilityButtons) {
    button.addEventListener('click', () => {
      if (activeEncounter()) return;
      const next = button.dataset.utility;
      if (utility === next) return closeUtility();
      closeUtility();
      utility = next;
      const name = next === 'inventory' ? 'Inventory' : 'Equipment';
      document.querySelector('#utility-title').textContent = name;
      utilityDescription.textContent = 'Your pack is empty. Collected items will appear here.';
      utilityDescription.hidden = next === 'equipment';
      equipmentContent.hidden = next !== 'equipment';
      utilitySurface.classList.toggle('equipment-open', next === 'equipment');
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
  return { refresh, isEncounter: () => current === 'encounter', enterEncounter(encounter, resources) {
    resetEncounter(encounter, resources);
    navigate('encounter', false);
    game.start();
    refresh();
    document.querySelector('#view-toggle').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, openChapter() { navigate('chapter'); } };
}
