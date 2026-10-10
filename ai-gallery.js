/* User-created AI photos. Films open in the shared video portfolio. */
(() => {
  const gallery = document.querySelector('#ai-grid');
  if (!gallery || typeof aiGallery === 'undefined' || !Array.isArray(aiGallery)) return;

  const items = new Map(aiGallery.map(item => [String(item.id), item]));
  const cards = [...gallery.querySelectorAll('[data-ai]')].filter(card => items.get(card.dataset.ai)?.kind === 'image');
  const collectionButtons = [...document.querySelectorAll('[data-ai-collection-filter]')];
  const count = document.querySelector('#ai-count');
  const more = document.querySelector('#ai-more');
  const empty = document.querySelector('#ai-empty');
  const dialog = document.querySelector('#ai-dialog');
  const media = document.querySelector('#ai-dialog-media');
  const close = document.querySelector('#ai-close');
  const previous = document.querySelector('#ai-previous');
  const next = document.querySelector('#ai-next');
  const original = document.querySelector('#ai-original');
  const batch = 8;
  let collection = 'fashion';
  let visible = batch;
  let sequence = [];
  let selected = 0;
  let lastCard;

  const collectionName = key => key === 'fashion' ? 'Fashion AI' : 'AI Explorations';
  const matchingCards = () => cards.filter(card => {
    const item = items.get(card.dataset.ai);
    return item && item.collection === collection;
  });

  function updatePage() {
    const matching = matchingCards();
    const shown = new Set(matching.slice(0, visible));
    cards.forEach(card => { card.hidden = !shown.has(card); });
    collectionButtons.forEach(button => {
      const key = button.dataset.aiCollectionFilter;
      button.setAttribute('aria-pressed', String(key === collection));
      const total = button.querySelector('.ai-collection-total');
      if (total) total.textContent = cards.filter(card => items.get(card.dataset.ai).collection === key).length;
    });
    if (count) count.textContent = `${Math.min(visible, matching.length)} nga ${matching.length} foto · ${collectionName(collection)}`;
    if (more) more.hidden = visible >= matching.length;
    if (empty) {
      empty.hidden = matching.length > 0;
      if (!matching.length) empty.textContent = 'Nuk ka foto në këtë koleksion.';
    }
  }

  collectionButtons.forEach(button => button.addEventListener('click', () => {
    if (!['fashion', 'explorations'].includes(button.dataset.aiCollectionFilter)) return;
    collection = button.dataset.aiCollectionFilter;
    visible = batch;
    updatePage();
  }));
  more?.addEventListener('click', () => {
    const firstNew = matchingCards()[visible];
    visible += batch;
    updatePage();
    firstNew?.focus({ preventScroll: true });
    firstNew?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
  updatePage();
  if (location.hash === '#ai-studio') requestAnimationFrame(() => document.querySelector('#ai-studio').scrollIntoView({ block: 'start', behavior: 'instant' }));

  document.querySelectorAll('[data-ai-featured]').forEach(trigger => trigger.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = trigger.dataset.aiFeatured;
    if (items.get(id)?.kind !== 'video') return;
    if (window.portfolioFeed?.open({ collection: 'ai', id, trigger })) event.preventDefault();
  }));

  if (!dialog || !media || !close || !previous || !next || !original) return;

  function clearMedia() {
    media.replaceChildren();
  }

  function selectItem(index) {
    const item = items.get(sequence[index]);
    if (!item || item.kind !== 'image') return;
    selected = index;
    clearMedia();
    const element = document.createElement('img');
    element.width = item.width;
    element.height = item.height;
    element.alt = item.alt || item.title;
    element.decoding = 'async';
    element.src = item.src;
    media.append(element);
    document.querySelector('#ai-dialog-title').textContent = item.title;
    document.querySelector('#ai-dialog-category').textContent = `${collectionName(item.collection)} / ${item.category} / FOTO`;
    document.querySelector('#ai-position').textContent = `${String(index + 1).padStart(2, '0')} / ${sequence.length}`;
    original.href = item.src;
    original.setAttribute('aria-label', `Hape foton “${item.title}” në një tab të ri`);
    previous.disabled = index === 0;
    next.disabled = index === sequence.length - 1;
  }

  function openItem(id, trigger, ids) {
    if (items.get(id)?.kind !== 'image') return false;
    sequence = ids;
    const index = sequence.indexOf(id);
    if (index < 0) return false;
    lastCard = trigger;
    selectItem(index);
    dialog.showModal();
    document.body.classList.add('dialog-open');
    dialog.scrollTop = 0;
    close.focus();
    return true;
  }

  cards.forEach(card => card.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (openItem(card.dataset.ai, card, matchingCards().map(card => card.dataset.ai))) event.preventDefault();
  }));

  previous.addEventListener('click', () => { if (selected > 0) selectItem(selected - 1); });
  next.addEventListener('click', () => { if (selected < sequence.length - 1) selectItem(selected + 1); });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'ArrowLeft' && selected > 0) {
      event.preventDefault();
      selectItem(selected - 1);
    } else if (event.key === 'ArrowRight' && selected < sequence.length - 1) {
      event.preventDefault();
      selectItem(selected + 1);
    }
  });
  dialog.addEventListener('close', () => {
    clearMedia();
    if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');
    // A sequence may extend beyond the current page; return to the opening card.
    if (lastCard && !lastCard.hidden) lastCard.focus({ preventScroll: true });
  });
})();
