/* Quiet, local film previews with an explicit pause control. */
(() => {
  const section = document.getElementById('video-library') || document.getElementById('films');
  const video = section?.querySelector('video.motion-preview');
  const preview = video?.closest('.motion-screen');
  const toggle = section?.querySelector('.motion-preview-toggle');
  if (!section || !preview || !video || !toggle) return;

  const label = toggle.querySelector('[data-preview-label]') || toggle.querySelector('span');
  const icon = toggle.querySelector('svg');
  const progress = section.querySelector('.motion-progress > span');
  const title = section.querySelector('.motion-lead-title');
  const opener = section.querySelector('[data-ai-featured]');
  const choices = [...section.querySelectorAll('[data-film-choice]')];
  const films = typeof aiGallery !== 'undefined' ? aiGallery.filter(item => item.kind === 'video') : [];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let selected = films.find(item => item.id === opener?.dataset.aiFeatured) || films.find(item => item.id === 'ai-29');
  let inView = false;
  let manuallyPaused = false;
  let manuallyRequested = false;
  let playbackFailed = false;
  let playRequest = 0;
  let playPending = false;

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = true;
  video.autoplay = false;
  video.preload = 'none';
  video.removeAttribute('autoplay');

  function filmName() {
    return selected?.title.replace(/\s*\/\s*Film$/i, '') || title?.textContent.trim() || 'Fashion film';
  }

  function updateControl() {
    const playing = !video.paused && !video.ended && !video.error;
    const action = playing ? 'Ndal preview' : 'Luaj preview';
    if (label) label.textContent = action;
    toggle.setAttribute('aria-label', `${action} për ${filmName()}, pa zë`);
    toggle.setAttribute('aria-pressed', String(playing));
    preview.classList.toggle('is-playing', playing);
    if (icon) {
      icon.setAttribute('viewBox', '0 0 16 18');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', playing ? 'M3 2h4v14H3zM10 2h4v14h-4z' : 'M1 1l14 8-14 8z');
      icon.replaceChildren(path);
    }
  }

  function updateProgress() {
    if (!progress) return;
    const fraction = Number.isFinite(video.duration) && video.duration > 0 ? video.currentTime / video.duration : 0;
    progress.style.transform = `scaleX(${Math.max(0, Math.min(1, fraction))})`;
  }

  function mayPlay() {
    const modalOpen = document.body.classList.contains('dialog-open') || !!document.querySelector('dialog[open]');
    const automaticPlayback = !reducedMotion.matches && !connection?.saveData && !playbackFailed;
    return inView && !document.hidden && !modalOpen && !manuallyPaused && (manuallyRequested || automaticPlayback);
  }

  function ensureSource() {
    const source = video.dataset.src || selected?.src;
    if (!source) return false;
    if (video.getAttribute('src') !== source) {
      video.preload = 'metadata';
      video.src = source;
      video.load();
    }
    return true;
  }

  function pausePreview() {
    playRequest += 1;
    playPending = false;
    video.pause();
    updateControl();
  }

  function synchronizePlayback() {
    if (!mayPlay()) {
      pausePreview();
      return;
    }
    if (!video.paused || playPending || !ensureSource()) return;
    const request = ++playRequest;
    playPending = true;
    video.muted = true;
    const playback = video.play();
    if (!playback?.then) {
      playPending = false;
      return;
    }
    playback.then(() => {
      if (request === playRequest) playPending = false;
      if (!mayPlay()) pausePreview();
      else updateControl();
    }).catch(error => {
      if (request !== playRequest) return;
      playPending = false;
      if (error.name !== 'AbortError') playbackFailed = true;
      updateControl();
    });
  }

  function selectFilm(id) {
    const item = films.find(film => film.id === id);
    if (!item || (selected?.id === item.id && video.dataset.src === item.src)) return;
    pausePreview();
    selected = item;
    playbackFailed = false;
    preview.classList.remove('has-video');
    video.removeAttribute('src');
    video.poster = item.thumb;
    video.dataset.src = item.src;
    video.load();
    if (title) title.textContent = filmName();
    if (opener) {
      opener.dataset.aiFeatured = item.id;
      opener.href = item.src;
      opener.setAttribute('aria-label', `Shiko ${filmName()} — film i krijuar me AI`);
    }
    const poster = preview.querySelector('.motion-preview-poster');
    if (poster instanceof HTMLImageElement) {
      poster.src = item.thumb;
      poster.alt = item.alt;
    }
    choices.forEach(choice => {
      const active = choice.dataset.filmChoice === item.id;
      choice.classList.toggle('is-active', active);
      choice.setAttribute('aria-pressed', String(active));
    });
    updateProgress();
    updateControl();
    synchronizePlayback();
  }

  toggle.addEventListener('click', () => {
    if (!video.paused || playPending) {
      manuallyPaused = true;
      manuallyRequested = false;
      pausePreview();
    } else {
      manuallyPaused = false;
      manuallyRequested = true;
      playbackFailed = false;
      synchronizePlayback();
    }
  });

  choices.forEach(choice => {
    choice.addEventListener('click', () => selectFilm(choice.dataset.filmChoice));
    const active = choice.dataset.filmChoice === selected?.id;
    choice.classList.toggle('is-active', active);
    choice.setAttribute('aria-pressed', String(active));
  });

  video.addEventListener('playing', () => {
    if (!mayPlay()) {
      pausePreview();
      return;
    }
    preview.classList.add('has-video');
    updateControl();
  });
  video.addEventListener('pause', updateControl);
  video.addEventListener('ended', updateControl);
  video.addEventListener('timeupdate', updateProgress);
  video.addEventListener('loadedmetadata', updateProgress);
  video.addEventListener('error', () => {
    playbackFailed = true;
    preview.classList.remove('has-video');
    pausePreview();
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.3);
      synchronizePlayback();
    }, { threshold: [0, 0.3, 1] });
    observer.observe(preview);
  } else {
    // Keep older browsers quiet until the user explicitly chooses to play.
    inView = true;
    manuallyPaused = true;
  }

  document.addEventListener('visibilitychange', synchronizePlayback);
  window.addEventListener('pagehide', pausePreview);
  window.addEventListener('pageshow', synchronizePlayback);
  reducedMotion.addEventListener('change', synchronizePlayback);
  connection?.addEventListener('change', synchronizePlayback);
  new MutationObserver(synchronizePlayback).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  if (selected && !video.dataset.src) video.dataset.src = selected.src;
  updateControl();
  updateProgress();
})();
