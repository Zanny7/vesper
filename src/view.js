// Presentation preferences only: switching views never changes combat state.
export function setupView(scene) {
  const toggle = document.querySelector('#view-toggle');
  const tooltip = document.querySelector('#hud-tooltip');
  let source = null;

  function hideTooltip() {
    source?.removeAttribute('aria-describedby');
    source = null;
    tooltip.hidden = true;
  }

  function refreshTooltip() {
    if (!source) return;
    if (!source.isConnected || !source.getClientRects().length) return hideTooltip();
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
    refreshTooltip();
  }

  function setImmersive(enabled) {
    hideTooltip();
    document.body.classList.toggle('immersive', enabled);
    scene.immersive = enabled;
    toggle.textContent = enabled ? 'Panel view' : 'Immersive view';
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.title = enabled ? 'Return to the detailed panel layout' : 'Expand the battlefield and use compact overlay controls';
    try { localStorage.setItem('vesper-view', enabled ? 'immersive' : 'panels'); } catch { /* Storage may be unavailable. */ }
    // ResizeObserver handles the resized canvas; no encounter reset or pause.
  }

  toggle.addEventListener('click', () => setImmersive(!document.body.classList.contains('immersive')));
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
  return { refreshTooltip };
}
