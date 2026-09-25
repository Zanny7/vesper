// Presentation preferences only: switching views never changes combat state.
export function setupView(scene) {
  const toggle = document.querySelector('#view-toggle');
  const tooltip = document.querySelector('#hud-tooltip');
  let source = null;
  let encounterVisible = false;
  let immersivePreferred = false;

  function hideTooltip() {
    source?.removeAttribute('aria-describedby');
    source = null;
    tooltip.hidden = true;
  }

  function refreshTooltip(force = false) {
    if (!source) return;
    if (!source.isConnected) return hideTooltip();
    if (!force && tooltip.textContent === source.dataset.tooltip) return;
    if (!source.getClientRects().length) return hideTooltip();
    tooltip.textContent = source.dataset.tooltip;
    const rect = source.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    tooltip.style.left = `${Math.max(10, Math.min(innerWidth - width - 10, rect.left + rect.width / 2 - width / 2))}px`;
    const top = rect.top - height - 12;
    tooltip.style.top = `${Math.max(10, Math.min(innerHeight - height - 10, top >= 10 ? top : rect.bottom + 12))}px`;
  }

  function showTooltip(element) {
    hideTooltip();
    source = element;
    source.setAttribute('aria-describedby', tooltip.id);
    tooltip.hidden = false;
    refreshTooltip(true);
  }

  function setImmersive(enabled) {
    hideTooltip();
    immersivePreferred = enabled;
    document.body.classList.toggle('immersive', enabled && encounterVisible);
    scene.immersive = enabled && encounterVisible;
    toggle.textContent = enabled ? 'Panel view' : 'Immersive view';
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.title = enabled ? 'Return to the detailed panel layout' : 'Expand the battlefield and use compact overlay controls';
    try { localStorage.setItem('vesper-view', enabled ? 'immersive' : 'panels'); } catch { /* Storage may be unavailable. */ }
    // ResizeObserver handles changes after the view is visible.
  }

  toggle.addEventListener('click', () => setImmersive(!immersivePreferred));
  document.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    const element = event.target.closest('[data-tooltip]');
    if (element && element !== source) showTooltip(element);
  });
  document.addEventListener('pointerout', event => {
    if (source && source.contains(event.target) && !source.contains(event.relatedTarget)) hideTooltip();
  });
  document.addEventListener('focusin', event => {
    const element = event.target.closest('[data-tooltip]');
    if (element) showTooltip(element);
  });
  document.addEventListener('focusout', hideTooltip);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hideTooltip(); });
  window.addEventListener('blur', hideTooltip);
  window.addEventListener('resize', hideTooltip);
  document.addEventListener('scroll', hideTooltip, true);
  let saved = 'panels';
  try { saved = localStorage.getItem('vesper-view'); } catch { /* Use the panel layout by default. */ }
  setImmersive(saved === 'immersive');
  return {
    refreshTooltip,
    setEncounterVisible(visible) {
      hideTooltip();
      encounterVisible = visible;
      document.body.classList.toggle('immersive', immersivePreferred && visible);
      scene.immersive = immersivePreferred && visible;
      // The canvas was initialized while its screen was hidden. Size it as
      // soon as the encounter is shown so the first rendered frame is visible.
      if (visible) scene.resize();
    },
  };
}
