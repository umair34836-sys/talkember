// Client-side search for the static (GitHub Pages) build.
(async () => {
  const BASE = ''; // set by the build when the site lives in a sub-folder
  const q = (new URLSearchParams(location.search).get('q') || '').trim();
  const input = document.getElementById('q-page');
  const results = document.getElementById('search-results');
  const empty = document.getElementById('search-empty');
  input.value = q;
  if (!q) return input.focus();

  document.getElementById('list-title').textContent = `Search: “${q}”`;
  document.title = `Search results for ${q}`;

  let index = [];
  try {
    index = await (await fetch(`${BASE}/search-index.json`)).json();
  } catch {
    empty.textContent = 'Search is not available right now.';
    empty.hidden = false;
    return;
  }

  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = index
    .map((p) => {
      const title = p.t.toLowerCase();
      const body = `${p.s} ${p.g} ${p.x}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (title.includes(t)) score += 3;
        else if (body.includes(t)) score += 1;
        else return null; // every word must match somewhere
      }
      return { p, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  document.getElementById('list-sub').textContent = `${scored.length} result${scored.length === 1 ? '' : 's'}`;
  empty.hidden = scored.length > 0;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  results.innerHTML = scored
    .map(({ p }) => `
      <article class="card" lang="${esc(p.l)}">
        <a class="card-media" href="${BASE}/${esc(p.u)}" tabindex="-1" aria-hidden="true">
          ${p.i ? `<img src="${p.i.startsWith('/') ? BASE : ''}${esc(p.i)}" alt="" width="640" height="360" loading="lazy">${p.b ? `<span class="thumb-label">${esc(p.b)}</span>` : ''}` : `<span class="card-fallback">${esc(p.c.slice(0, 1))}</span>`}
        </a>
        <div class="card-body">
          <p class="card-kicker">${esc(p.c)}</p>
          <h3 class="card-title"><a href="${BASE}/${esc(p.u)}">${esc(p.t)}</a></h3>
          ${p.s ? `<p class="card-summary">${esc(p.s)}</p>` : ''}
          <p class="card-meta muted small">${esc(p.d)}</p>
        </div>
      </article>`)
    .join('');
})();
