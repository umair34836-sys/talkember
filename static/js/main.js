(() => {
  const root = document.documentElement;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      const action = btn.dataset.action;
      if (action === 'theme') {
        const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
        root.dataset.theme = dark ? 'light' : 'dark';
        store.set('theme', root.dataset.theme);
      }
      if (action === 'text-size') {
        const order = ['', 'lg', 'xl'];
        const next = order[(order.indexOf(root.dataset.textSize || '') + 1) % order.length];
        if (next) root.dataset.textSize = next; else delete root.dataset.textSize;
        store.set('textSize', next);
      }
      if (action === 'copy-link') {
        navigator.clipboard?.writeText(btn.dataset.url).then(() => {
          const old = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = old; }, 1500);
        });
      }
    }

    // YouTube facade: load the heavy iframe only when the reader presses play
    const yt = e.target.closest('.yt-lite');
    if (yt) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${yt.dataset.yt}?autoplay=1&rel=0`;
      iframe.title = yt.getAttribute('aria-label') || 'Video';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      yt.replaceWith(iframe);
    }

    const confirmEl = e.target.closest('[data-confirm]');
    if (confirmEl && !window.confirm(confirmEl.dataset.confirm)) e.preventDefault();
  });
})();
