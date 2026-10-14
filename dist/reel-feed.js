/* A private reel player containing only the work supplied by arber.ai. */
(() => {
  const dialog = document.getElementById('reel-feed');
  const track = document.getElementById('feed-track');
  const closeButton = document.getElementById('feed-close');
  const previousButton = document.getElementById('feed-previous');
  const nextButton = document.getElementById('feed-next');
  const position = document.getElementById('feed-position');
  const title = document.getElementById('feed-title');
  const collaboration = document.getElementById('feed-collaboration');
  const status = document.getElementById('feed-status');
  const gridLink = document.getElementById('feed-view-grid');
  const tabs = [...document.querySelectorAll('[data-feed-collection]')];
  if (!dialog || !track || !closeButton || !previousButton || !nextButton) return;

  const collections = {
    koral: {
      name: 'Koral Secrets Kosova',
      collaboration: 'Gravitas Media',
      grid: '#reels',
      items: typeof koralVideos === 'undefined' ? [] : koralVideos.map(item => ({
        ...item, kind: 'instagram', thumb: `assets/koral-secrets/${item.id}.jpg`,
      })),
    },
    diverse: {
      name: 'Diverse Academy',
      grid: '#diverse',
      items: typeof diverseVideos === 'undefined' ? [] : diverseVideos.map(item => ({
        ...item, kind: 'instagram', thumb: `assets/diverse-academy/${item.id}.jpg`,
      })),
    },
    ai: {
      name: 'AI Films',
      grid: '#ai-studio',
      items: typeof aiGallery === 'undefined' ? [] : aiGallery.filter(item => item.kind === 'video'),
    },
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let collection = 'koral';
  let slides = [];
  let selected = -1;
  let requested = -1;
  let opener;
  let generation = 0;
  let settling;
  let resizeFrame;
  let initializing = false;
  let scrolling = false;
  let restoreFocus = true;
  let aiPlaybackRequested = false;
  let wheelDelta = 0;
  let wheelLockedUntil = 0;
  let wheelReset;
  let resumeAfterScroll = false;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function playIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon-play');
    svg.setAttribute('viewBox', '0 0 16 18');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M1 1l14 8-14 8z');
    svg.append(path);
    return svg;
  }

  function announce(message = '') {
    if (status) status.textContent = message;
  }

  function clearMedia() {
    generation += 1;
    track.querySelectorAll('video').forEach(video => {
      video.pause();
      video.removeAttribute('src');
      video.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
      video.load();
    });
    track.querySelectorAll('.feed-player').forEach(player => player.replaceChildren());
    slides.forEach(slide => {
      slide.classList.remove('is-loaded', 'is-playing');
      const start = slide.querySelector('.feed-start');
      if (start) start.hidden = false;
    });
  }

  function slideTop(index) {
    return slides[index] ? slides[index].offsetTop - (slides[0]?.offsetTop || 0) : 0;
  }

  function nearestIndex() {
    let closest = selected < 0 ? 0 : selected;
    let distance = Infinity;
    slides.forEach((slide, index) => {
      const candidate = Math.abs(track.scrollTop - slideTop(index));
      if (candidate < distance) {
        closest = index;
        distance = candidate;
      }
    });
    return closest;
  }

  function updateControls() {
    const data = collections[collection];
    const index = Math.max(0, selected);
    if (position) position.textContent = `${String(index + 1).padStart(2, '0')} / ${data.items.length}`;
    if (title) title.textContent = data.name;
    if (collaboration) collaboration.hidden = !data.collaboration;
    previousButton.disabled = index <= 0;
    nextButton.disabled = index >= data.items.length - 1;
    if (gridLink) gridLink.href = data.grid;
    tabs.forEach(tab => {
      const key = tab.dataset.feedCollection;
      const active = key === collection;
      tab.setAttribute('aria-pressed', String(active));
      tab.classList.toggle('is-active', active);
      const count = tab.querySelector('[data-feed-count]');
      if (count && collections[key]) count.textContent = collections[key].items.length;
    });
  }

  function isCurrent(video, version) {
    return dialog.open && version === generation && slides[selected]?.contains(video);
  }

  function playNative(video, automatic = false) {
    if (automatic && (reducedMotion.matches || connection?.saveData || document.hidden)) return;
    const version = generation;
    const playback = video.play();
    if (!playback?.then) return;
    playback.then(() => {
      if (!isCurrent(video, version)) video.pause();
    }).catch(error => {
      if (isCurrent(video, version) && error.name !== 'AbortError') {
        announce('Përdore play në video për ta nisur.');
        const start = slides[selected]?.querySelector('.feed-start');
        if (start) start.hidden = false;
      }
    });
  }

  function loadNative(item, slide) {
    const video = element('video', 'feed-native feed-video');
    video.controls = true;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = 'metadata';
    video.poster = item.thumb;
    video.width = item.width;
    video.height = item.height;
    video.setAttribute('aria-label', `${item.title} · Video e krijuar nga arber.ai`);
    video.addEventListener('playing', () => {
      if (!dialog.open || !slide.classList.contains('is-active')) {
        video.pause();
        return;
      }
      aiPlaybackRequested = true;
      slide.classList.add('is-loaded', 'is-playing');
      slide.querySelector('.feed-start').hidden = true;
      announce('');
    });
    video.addEventListener('pause', () => slide.classList.remove('is-playing'));
    video.addEventListener('error', () => {
      if (slide !== slides[selected] || !dialog.open) return;
      slide.querySelector('.feed-start').hidden = false;
      announce('Video nuk u ngarkua. Mund ta hapësh me lidhjen poshtë.');
    });
    slide.querySelector('.feed-player').append(video);
    video.src = item.src;
    if (aiPlaybackRequested && !scrolling) playNative(video, true);
  }

  function select(index) {
    if (!dialog.open || !collections[collection].items[index]) return;
    if (index === selected && slides[index]?.classList.contains('is-active')) {
      requested = index;
      return;
    }
    const focusWithinPrevious = slides[selected]?.contains(document.activeElement);
    if (focusWithinPrevious) track.focus({ preventScroll: true });
    clearMedia();
    selected = index;
    requested = index;
    slides.forEach((slide, candidate) => {
      const active = candidate === index;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active;
      if (active) slide.setAttribute('aria-current', 'true');
      else slide.removeAttribute('aria-current');
      const start = slide.querySelector('.feed-start');
      if (start) start.disabled = !active;
    });
    updateControls();
    announce(`${index + 1} nga ${slides.length} · ${collections[collection].name}`);
    const item = collections[collection].items[index];
    if (item.kind === 'video') loadNative(item, slides[index]);
    dialog.dispatchEvent(new CustomEvent('portfolio:feed-change', {
      detail: { collection, id: item.id, index, total: slides.length },
    }));
  }

  function settle() {
    clearTimeout(settling);
    if (!dialog.open || initializing || !slides.length) return;
    scrolling = false;
    track.classList.remove('is-scrolling');
    const index = nearestIndex();
    const unchanged = index === selected;
    select(index);
    if (unchanged && resumeAfterScroll) {
      const video = slides[selected]?.querySelector('video');
      if (video && !document.hidden) playNative(video);
    }
    resumeAfterScroll = false;
  }

  function goTo(index, options = {}) {
    if (!dialog.open || !Number.isInteger(index) || !slides[index]) return false;
    requested = index;
    const behavior = options.instant || reducedMotion.matches ? 'instant' : 'smooth';
    track.scrollTo({ top: slideTop(index), behavior });
    if (behavior === 'instant' || Math.abs(track.scrollTop - slideTop(index)) < 1) settle();
    else {
      clearTimeout(settling);
      settling = setTimeout(settle, 190);
    }
    return true;
  }

  function step(direction) {
    const current = requested < 0 ? Math.max(0, selected) : requested;
    if (!goTo(current + direction)) {
      announce(direction > 0 ? 'Kjo është videoja e fundit në këtë koleksion.' : 'Kjo është videoja e parë në këtë koleksion.');
    }
  }

  function start(index) {
    if (!dialog.open || index !== selected || scrolling) return;
    const item = collections[collection].items[index];
    const slide = slides[index];
    if (item.kind === 'video') {
      const video = slide.querySelector('video');
      if (video) {
        aiPlaybackRequested = true;
        playNative(video);
      }
      return;
    }
    if (slide.querySelector('iframe')) return;
    const iframe = element('iframe', 'feed-instagram');
    iframe.title = `Video ${String(index + 1).padStart(2, '0')} · ${collections[collection].name}`;
    iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.src = `${item.url.replace(/\/?$/, '/')}embed/`;
    slide.querySelector('.feed-player').append(iframe);
    slide.classList.add('is-loaded');
    slide.querySelector('.feed-start').hidden = true;
    announce('Video hapet nga Instagram. Nëse nuk shfaqet, përdore “Hape në Instagram”.');
  }

  function render() {
    clearMedia();
    track.replaceChildren();
    const data = collections[collection];
    const fragment = document.createDocumentFragment();
    slides = data.items.map((item, index) => {
      const number = String(index + 1).padStart(2, '0');
      const slide = element('article', 'feed-slide');
      if (item.kind === 'video' && item.width > item.height) slide.classList.add('is-landscape');
      slide.dataset.feedIndex = index;
      slide.dataset.feedId = item.id;
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'video');
      slide.setAttribute('aria-label', `${number} nga ${data.items.length} · ${item.title || data.name}`);
      slide.setAttribute('aria-hidden', 'true');
      slide.inert = true;
      const media = element('div', 'feed-media');
      const poster = element('img', 'feed-poster');
      poster.src = item.thumb;
      poster.alt = item.alt || `${data.name} · Video ${number}${item.ai ? ' · AI content' : ''}`;
      poster.loading = 'lazy';
      poster.decoding = 'async';
      poster.width = item.kind === 'video' ? item.width : 720;
      poster.height = item.kind === 'video' ? item.height : 1280;
      const player = element('div', 'feed-player');
      const startButton = element('button', 'feed-start');
      startButton.type = 'button';
      startButton.setAttribute('aria-label', `Luaj ${item.title || `videon ${number} për ${data.name}`}`);
      startButton.append(playIcon(), element('span', '', 'Luaj videon'));
      startButton.addEventListener('click', () => start(index));
      media.append(poster, player, startButton);
      const info = element('div', 'feed-slide-info');
      info.append(element('div', 'feed-slide-label', item.kind === 'video' ? `AI FILM / ${item.category}` : item.ai ? 'AI CONTENT / INSTAGRAM' : 'CONTENT CREATION / INSTAGRAM'));
      info.append(element('h3', 'feed-slide-title', item.title || `${data.name} / ${number}`));
      const external = element('a', 'feed-external', item.kind === 'video' ? 'Hape videon origjinale ↗' : 'Hape në Instagram ↗');
      external.href = item.kind === 'video' ? item.src : item.url;
      external.target = '_blank';
      external.rel = 'noopener noreferrer';
      info.append(external);
      slide.append(media, info);
      fragment.append(slide);
      return slide;
    });
    track.append(fragment);
    selected = -1;
    requested = -1;
  }

  function chooseCollection(key, index = 0) {
    if (!collections[key]?.items.length) return false;
    initializing = true;
    clearTimeout(settling);
    collection = key;
    scrolling = false;
    track.classList.remove('is-scrolling');
    render();
    track.scrollTo({ top: 0, behavior: 'instant' });
    if (dialog.open) {
      track.scrollTo({ top: slideTop(index), behavior: 'instant' });
      initializing = false;
      select(index);
    } else initializing = false;
    return true;
  }

  function open(options = {}) {
    const key = options.collection || 'koral';
    const data = collections[key];
    if (!data?.items.length) return false;
    const index = options.id ? data.items.findIndex(item => item.id === String(options.id)) : 0;
    if (index < 0) return false;
    opener = options.trigger instanceof HTMLElement ? options.trigger : document.activeElement;
    restoreFocus = true;
    aiPlaybackRequested = false;
    chooseCollection(key, index);
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('dialog-open', 'feed-open');
    initializing = true;
    track.scrollTo({ top: slideTop(index), behavior: 'instant' });
    initializing = false;
    select(index);
    closeButton.focus({ preventScroll: true });
    return true;
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  track.tabIndex = 0;
  track.addEventListener('scroll', () => {
    if (!dialog.open || initializing) return;
    const video = slides[selected]?.querySelector('video');
    if (!scrolling) resumeAfterScroll = !!video && !video.paused;
    scrolling = true;
    track.classList.add('is-scrolling');
    if (video && !video.paused) video.pause();
    clearTimeout(settling);
    settling = setTimeout(settle, 160);
  }, { passive: true });
  track.addEventListener('scrollend', settle);

  previousButton.addEventListener('click', () => step(-1));
  nextButton.addEventListener('click', () => step(1));
  closeButton.addEventListener('click', close);
  tabs.forEach(tab => tab.addEventListener('click', () => {
    if (tab.dataset.feedCollection !== collection) chooseCollection(tab.dataset.feedCollection);
  }));
  gridLink?.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    restoreFocus = false;
    close();
  });

  document.querySelectorAll('[data-open-feed]').forEach(trigger => trigger.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (open({ collection: trigger.dataset.openFeed || 'koral', id: trigger.dataset.feedId, trigger })) event.preventDefault();
  }));

  dialog.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest('video, input, textarea, select, [contenteditable="true"]')) return;
    if (['ArrowDown', 'PageDown'].includes(event.key)) {
      event.preventDefault();
      step(1);
    } else if (['ArrowUp', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      goTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      goTo(slides.length - 1);
    }
  });

  track.addEventListener('wheel', event => {
    if (!dialog.open || event.ctrlKey || event.target.closest('video')) return;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    clearTimeout(wheelReset);
    wheelReset = setTimeout(() => { wheelDelta = 0; }, 150);
    if (Date.now() < wheelLockedUntil) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientHeight : 1;
    wheelDelta += event.deltaY * unit;
    if (Math.abs(wheelDelta) < 30) return;
    step(wheelDelta > 0 ? 1 : -1);
    wheelDelta = 0;
    wheelLockedUntil = Date.now() + 700;
  }, { passive: false });

  // Native track scrolling is conventional; this rail also works beside an
  // Instagram iframe and follows the requested DOWN=next, UP=previous gestures.
  document.querySelectorAll('[data-feed-swipe]').forEach(rail => {
    let origin;
    rail.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !dialog.open) return;
      origin = { id: event.pointerId, x: event.clientX, y: event.clientY };
      rail.setPointerCapture?.(event.pointerId);
    });
    rail.addEventListener('pointerup', event => {
      if (!origin || origin.id !== event.pointerId) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      origin = undefined;
      if (Math.abs(dy) >= 35 && Math.abs(dy) > Math.abs(dx)) step(dy > 0 ? 1 : -1);
      if (rail.hasPointerCapture?.(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    });
    rail.addEventListener('pointercancel', () => { origin = undefined; });
    rail.addEventListener('lostpointercapture', () => { origin = undefined; });
  });

  dialog.addEventListener('close', () => {
    clearTimeout(settling);
    clearTimeout(wheelReset);
    cancelAnimationFrame(resizeFrame);
    clearMedia();
    track.replaceChildren();
    slides = [];
    selected = -1;
    requested = -1;
    scrolling = false;
    aiPlaybackRequested = false;
    document.body.classList.remove('feed-open');
    if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open');
    if (restoreFocus && opener?.isConnected && opener.getClientRects().length) opener.focus({ preventScroll: true });
    announce('');
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) track.querySelectorAll('video').forEach(video => video.pause());
  });
  window.addEventListener('pagehide', () => {
    track.querySelectorAll('video').forEach(video => video.pause());
    track.querySelectorAll('iframe').forEach(frame => frame.remove());
  });
  window.addEventListener('resize', () => {
    if (!dialog.open || selected < 0) return;
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => goTo(selected, { instant: true }));
  });

  window.portfolioFeed = {
    open,
    close,
    goTo,
    getState: () => ({ collection, index: selected, id: collections[collection]?.items[selected]?.id, total: slides.length, open: dialog.open }),
  };
})();
