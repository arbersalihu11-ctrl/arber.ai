/* User-created AI work. Only the selected video is loaded, without autoplay. */
(() => {
  const gallery = document.querySelector('#ai-grid');
  if (!gallery || typeof aiGallery === 'undefined' || !Array.isArray(aiGallery)) return;

  const cards = [...gallery.querySelectorAll('[data-ai]')];
  const items = new Map(aiGallery.map(item => [String(item.id), item]));
  const collectionButtons = [...document.querySelectorAll('[data-ai-collection-filter]')];
  const kindButtons = [...document.querySelectorAll('[data-ai-kind-filter]')];
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
  let kind = 'all';
  let visible = batch;
  let sequence = [];
  let selected = 0;
  let lastCard;

  const collectionName = key => key === 'fashion' ? 'Fashion AI' : 'AI Explorations';
  const matchingCards = () => cards.filter(card => {
    const item = items.get(card.dataset.ai);
    return item && item.collection === collection && (kind === 'all' || item.kind === kind);
  });

  function updatePage() {
    const matching = matchingCards();
    const shown = new Set(matching.slice(0, visible));
    cards.forEach(card => { card.hidden = !shown.has(card); });
    collectionButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.aiCollectionFilter === collection)));
    kindButtons.forEach(button => {
      const filter = button.dataset.aiKindFilter;
      button.setAttribute('aria-pressed', String(filter === kind));
      const label = button.querySelector('[data-ai-filter-count]');
      if (label) label.textContent = aiGallery.filter(item => item.collection === collection && (filter === 'all' || item.kind === filter)).length;
    });
    const noun = kind === 'image' ? 'foto' : kind === 'video' ? 'video' : 'punime';
    if (count) count.textContent = `${Math.min(visible, matching.length)} nga ${matching.length} ${noun} · ${collectionName(collection)}`;
    if (more) more.hidden = visible >= matching.length;
    if (empty) {
      empty.hidden = matching.length > 0;
      if (!matching.length) empty.textContent = kind === 'video' ? 'Ky koleksion për momentin përmban vetëm foto. Zgjedh “Fotot” për t’i parë.' : 'Nuk ka punime në këtë filtër. Zgjedh një format tjetër.';
    }
  }

  collectionButtons.forEach(button => button.addEventListener('click', () => {
    if (!['fashion', 'explorations'].includes(button.dataset.aiCollectionFilter)) return;
    collection = button.dataset.aiCollectionFilter;
    kind = 'all';
    visible = batch;
    updatePage();
  }));
  kindButtons.forEach(button => button.addEventListener('click', () => {
    if (!['all', 'image', 'video'].includes(button.dataset.aiKindFilter)) return;
    kind = button.dataset.aiKindFilter;
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

  if (!dialog || !media || !close || !previous || !next || !original) return;

  function clearMedia() {
    media.querySelectorAll('video').forEach(video => {
      video.pause();
      video.removeAttribute('src');
      video.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
      video.load();
    });
    media.replaceChildren();
  }

  function selectItem(index) {
    const item = items.get(sequence[index]?.dataset.ai);
    if (!item) return;
    selected = index;
    clearMedia();
    const element = document.createElement(item.kind === 'video' ? 'video' : 'img');
    element.width = item.width;
    element.height = item.height;
    if (item.kind === 'video') {
      element.controls = true;
      element.playsInline = true;
      element.preload = 'metadata';
      element.poster = item.thumb;
      element.setAttribute('aria-label', `${item.title} · Video e krijuar me AI nga arber.ai`);
    } else {
      element.alt = item.alt || item.title;
      element.decoding = 'async';
    }
    element.src = item.src;
    media.append(element);
    document.querySelector('#ai-dialog-title').textContent = item.title;
    document.querySelector('#ai-dialog-category').textContent = `${collectionName(item.collection)} / ${item.category} / ${item.kind === 'video' ? 'VIDEO' : 'FOTO'}`;
    document.querySelector('#ai-position').textContent = `${String(index + 1).padStart(2, '0')} / ${sequence.length}`;
    original.href = item.src;
    original.setAttribute('aria-label', `Hape ${item.kind === 'video' ? 'videon' : 'foton'} “${item.title}” në një tab të ri`);
    previous.disabled = index === 0;
    next.disabled = index === sequence.length - 1;
  }

  cards.forEach(card => card.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!items.has(card.dataset.ai)) return;
    event.preventDefault();
    lastCard = card;
    sequence = matchingCards();
    const index = sequence.indexOf(card);
    if (index < 0) return;
    selectItem(index);
    dialog.showModal();
    document.body.classList.add('dialog-open');
    dialog.scrollTop = 0;
    close.focus();
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
    if (event.target.closest('video, input, textarea, select, [contenteditable="true"]')) return;
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
