const desired = new Set();
let globalPaused = false;

function wantPlay(video)  { desired.add(video);    if (!globalPaused) video.play().catch(() => {}); }
function wantPause(video) { desired.delete(video); video.pause(); }

function ready(video) {
  if (video.readyState >= 3) return Promise.resolve();   // already playable
  video.preload = 'auto';
  video.load();
  return new Promise(resolve => {
    video.addEventListener('canplay', resolve, { once: true });
    video.addEventListener('error',   resolve, { once: true });
  });
}

function startInSync(videos, stillWanted = () => true) {
  Promise.all(videos.map(ready)).then(() => {
    if (!stillWanted()) return;
    videos.forEach(v => { v.currentTime = 0; });
    videos.forEach(wantPlay);
  });
}

/* HERO */
(function initHero() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const label = hero.querySelector('.hero__action');
  const vidA  = hero.querySelector('.hero__video--a');
  const vidB  = hero.querySelector('.hero__video--b');
  if (!label || !vidA || !vidB) return;

  const clips = JSON.parse(hero.dataset.hero || '[]');
  if (clips.length < 2) return;

  const fadeDuration = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--fade-duration')
  ) || 300;

  let index = 0;
  let front = vidA;  // currently visible
  let back  = vidB;  // preloading next

  function setSources(videoEl, clip) {
    videoEl.innerHTML =
      `<source src="${clip.mov}" type="video/quicktime; codecs=hvc1">` +
      `<source src="${clip.webm}" type="video/webm">`;
  }

  function advance() {
    index = (index + 1) % clips.length;

    setSources(back, clips[index]);
    back.load();
    wantPlay(back);

    label.classList.add('is-fading');
    setTimeout(() => {
      back.style.opacity  = '1';
      front.style.opacity = '0';
      wantPause(front);
      front.innerHTML = '';
      [front, back] = [back, front];
      front.addEventListener('ended', advance, { once: true });

      label.textContent = clips[index].label;
      label.classList.remove('is-fading');
    }, fadeDuration);
  }

  front.addEventListener('ended', advance, { once: true });
  desired.add(front);
})();

/* CAROUSEL */
function initCarousel(carousel, { onActivate } = {}) {
  const track   = carousel.querySelector('.carousel__track');
  const items   = Array.from(track.querySelectorAll(':scope > *'));
  const dotsEl  = carousel.querySelector('.carousel__dots');
  const prev    = carousel.querySelector('.carousel__btn--prev');
  const next    = carousel.querySelector('.carousel__btn--next');
  if (!track || items.length === 0) return;

  dotsEl.innerHTML = '';

  let current     = 0;
  let isScrolling = false;

  items.forEach((item, i) => {
    const dot = document.createElement('button');
    dot.className = 'carousel__dot' + (i === 0 ? ' is-active' : '');
    dot.setAttribute('aria-label', item.dataset.action || `Item ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
  });
  const dotEls = Array.from(dotsEl.querySelectorAll('.carousel__dot'));

  function updateUI() {
    dotEls.forEach((d, j) => d.classList.toggle('is-active', j === current));
    prev.disabled = current === 0;
    next.disabled = current === items.length - 1;
  }

  function goTo(i) {
    current = Math.max(0, Math.min(i, items.length - 1));
    isScrolling = true;
    track.scrollTo({ left: track.clientWidth * current, behavior: 'smooth' });
    clearTimeout(track._scrollTimer);
    track._scrollTimer = setTimeout(() => { isScrolling = false; }, 600);
    onActivate?.(items[current]);
    updateUI();
  }

  prev.addEventListener('click', () => goTo(current - 1));
  next.addEventListener('click', () => goTo(current + 1));

  const observer = new IntersectionObserver(
    entries => {
      if (isScrolling) return;
      entries.forEach(e => {
        if (e.isIntersecting) {
          current = items.indexOf(e.target);
          onActivate?.(items[current]);
          updateUI();
        }
      });
    },
    { root: track, threshold: 0.6 }
  );
  items.forEach(item => observer.observe(item));

  goTo(0);
}

const videoCarousel = document.querySelector('.carousel');
if (videoCarousel) {
  let activeRow = null;
  initCarousel(videoCarousel, {
    onActivate(row) {
      activeRow = row;
      videoCarousel.querySelectorAll('.carousel__track video').forEach(wantPause);
      startInSync([...row.querySelectorAll('video')], () => activeRow === row);
    }
  });
}

function lazyPlay(root, videos) {
  let visible = false;
  new IntersectionObserver(entries => entries.forEach(e => {
    visible = e.isIntersecting;
    if (visible) startInSync(videos, () => visible);
    else videos.forEach(wantPause);
  }), { threshold: 0.25 }).observe(root);
}

document.querySelectorAll('.vid-pair').forEach(p => lazyPlay(p, [...p.querySelectorAll('video')]));
document.querySelectorAll('.js-lazy-video').forEach(v => lazyPlay(v, [v]));

const imageCarousel = document.querySelector('.img-carousel');
if (imageCarousel) {
  const track = imageCarousel.querySelector('.carousel__track');
  const prev  = imageCarousel.querySelector('.img-carousel__btn--prev');
  const next  = imageCarousel.querySelector('.img-carousel__btn--next');
  const step  = () => track.clientWidth * 0.4;

  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left:  step(), behavior: 'smooth' }));
}

/* MEDIA TOGGLE */ 
const mediaToggle = document.querySelector('.media-toggle');
if (mediaToggle) {
  mediaToggle.addEventListener('click', () => {
    globalPaused = !globalPaused;
    mediaToggle.classList.toggle('is-paused', globalPaused);
    mediaToggle.setAttribute('aria-label', globalPaused ? 'Play all media' : 'Pause all media');

    if (globalPaused) document.querySelectorAll('video').forEach(v => v.pause());
    else desired.forEach(v => v.play().catch(() => {}));
  });
}

const revealTrigger = document.querySelector('.reveal-trigger');
const revealTarget  = document.querySelector('[data-reveal]');
if (revealTrigger && revealTarget) {
  revealTrigger.addEventListener('mouseenter', () => {
    revealTarget.classList.add('is-revealed');
    const video = revealTarget.querySelector('video');
    if (video) wantPlay(video);
  }, { once: true });
}
