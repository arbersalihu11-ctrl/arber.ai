/* Native portfolio archives retain normal links and keyboard controls. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => reducedMotion.matches ? 'instant' : 'smooth';

  function fragmentTarget(hash) {
    if (!hash || hash === '#') return null;
    let id = hash.slice(1);
    try { id = decodeURIComponent(id); } catch { /* Keep malformed fragments literal. */ }
    return document.getElementById(id) || [...document.getElementsByName(id)].find(element => element.tagName === 'A') || null;
  }

  function revealAncestors(target) {
    const ancestors = [];
    for (let details = target.closest('details'); details; details = details.parentElement?.closest('details')) {
      if (!details.open) ancestors.push(details);
    }
    ancestors.reverse().forEach(details => { details.open = true; });
    return ancestors.length > 0;
  }

  function revealCurrentHash() {
    const hash = window.location.hash;
    const target = fragmentTarget(hash);
    if (!target || !revealAncestors(target)) return;
    requestAnimationFrame(() => {
      if (window.location.hash === hash) target.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
    });
  }

  // Reveal before the browser positions an ordinary same-page anchor.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('target') || link.hasAttribute('download')) return;
    let url;
    try { url = new URL(link.getAttribute('href'), document.baseURI); } catch { return; }
    const hash = url.hash;
    const currentUrl = new URL(window.location.href);
    url.hash = '';
    currentUrl.hash = '';
    if (url.href !== currentUrl.href) return;
    const target = fragmentTarget(hash);
    if (target) revealAncestors(target);
  }, true);

  // Existing filter listeners on each button run before this bubbling listener.
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('.filter[data-filter]');
    if (!button || button.dataset.filter === 'all') return;
    const concepts = document.querySelector('details.portfolio-archive[data-archive="concepts"]');
    if (!concepts) return;
    const hasMatch = [...concepts.querySelectorAll('.project[data-category]')].some(project => !project.hidden && project.dataset.category === button.dataset.filter);
    if (hasMatch) concepts.open = true;
  });

  function initialize() {
    document.querySelectorAll('button[data-close-archive="reels"], button[data-close-archive="ai"]').forEach(button => {
      button.addEventListener('click', () => {
        const details = button.closest('details');
        if (!details) return;
        details.open = false;
        const summary = details.querySelector(':scope > summary');
        if (!summary) return;
        summary.focus({ preventScroll: true });
        summary.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
      });
    });
    revealCurrentHash();
  }

  window.addEventListener('hashchange', revealCurrentHash);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
