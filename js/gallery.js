// Each .gallery is independent; its links are the source of truth.
(() => {
  const english = document.documentElement.lang === 'en';
  const labels = english
    ? { gallery: 'Photo gallery', close: 'Close', previous: 'Previous photo', next: 'Next photo', error: 'Image could not be loaded.' }
    : { gallery: 'Фотогалерея', close: 'Закрыть', previous: 'Предыдущее фото', next: 'Следующее фото', error: 'Не удалось загрузить изображение.' };
  const dialog = document.createElement('dialog');
  dialog.className = 'photo-viewer';
  dialog.setAttribute('aria-label', labels.gallery);
  dialog.innerHTML = `
    <button class="photo-viewer__close" type="button" aria-label="${labels.close}" autofocus>×</button>
    <button class="photo-viewer__previous" type="button" aria-label="${labels.previous}">‹</button>
    <figure><img alt=""><figcaption></figcaption><p class="photo-viewer__error" role="status" hidden></p></figure>
    <button class="photo-viewer__next" type="button" aria-label="${labels.next}">›</button>
    <output class="photo-viewer__count" aria-live="polite"></output>`;
  document.body.append(dialog);

  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('figcaption');
  const error = dialog.querySelector('.photo-viewer__error');
  const previous = dialog.querySelector('.photo-viewer__previous');
  const next = dialog.querySelector('.photo-viewer__next');
  const count = dialog.querySelector('output');
  let activeLinks = [];
  let activeIndex = 0;
  let opener;
  let previousOverflow;
  function show(index) {
    activeIndex = (index + activeLinks.length) % activeLinks.length;
    const link = activeLinks[activeIndex];
    const thumbnail = link.querySelector('img');
    error.hidden = true;
    image.alt = thumbnail.alt;
    image.src = link.href;
    caption.textContent = link.dataset.caption || thumbnail.alt;
    count.textContent = `${activeIndex + 1} / ${activeLinks.length}`;
    previous.hidden = next.hidden = activeLinks.length < 2;
  }

  image.addEventListener('error', () => {
    error.textContent = labels.error;
    error.hidden = false;
  });
  previous.addEventListener('click', () => show(activeIndex - 1));
  next.addEventListener('click', () => show(activeIndex + 1));
  dialog.querySelector('.photo-viewer__close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    opener?.focus({ preventScroll: true });
  });
  let touchStart;
  image.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  image.addEventListener('touchend', event => {
    if (!touchStart || event.touches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(activeIndex + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  image.addEventListener('touchcancel', () => { touchStart = null; });

  document.querySelectorAll('.gallery').forEach(gallery => {
    const links = Array.from(gallery.querySelectorAll('a')).filter(link => link.querySelector('img'));
    if (!links.length) return;
    gallery.setAttribute('role', 'region');
    if (!gallery.hasAttribute('aria-label')) gallery.setAttribute('aria-label', labels.gallery);
    const counter = document.createElement('output');
    counter.className = 'gallery-count';
    gallery.after(counter);
    function updateCounter() {
      const left = gallery.getBoundingClientRect().left;
      const closest = links.reduce((best, link, index) =>
        Math.abs(link.getBoundingClientRect().left - left) < Math.abs(links[best].getBoundingClientRect().left - left) ? index : best, 0);
      counter.textContent = `${closest + 1} / ${links.length}`;
    }
    gallery.addEventListener('scroll', updateCounter, { passive: true });
    new ResizeObserver(updateCounter).observe(gallery);
    updateCounter();
    links.forEach((link, index) => {
      const thumbnail = link.querySelector('img');
      thumbnail.loading = 'lazy';
      thumbnail.decoding = 'async';
      link.setAttribute('aria-haspopup', 'dialog');
      link.addEventListener('click', event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        // Links still open originals when the browser does not support dialog.
        if (typeof dialog.showModal !== 'function') return;
        event.preventDefault();
        activeLinks = links;
        opener = link;
        show(index);
        previousOverflow = document.body.style.overflow;
        dialog.showModal();
        document.body.style.overflow = 'hidden';
      });
    });
  });
})();
