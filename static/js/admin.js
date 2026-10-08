(() => {
  const $ = (s) => document.querySelector(s);
  const form = $('#post-form');
  if (!form) return;
  const csrf = form.querySelector('[name=csrf]').value;
  const md = $('#content_md');

  if (new URLSearchParams(location.search).get('saved')) $('[data-show-if-saved]')?.removeAttribute('hidden');

  // ---------- markdown toolbar ----------
  function insert(before, after = '', placeholder = '') {
    const { selectionStart: s, selectionEnd: e, value } = md;
    const sel = value.slice(s, e) || placeholder;
    md.setRangeText(before + sel + after, s, e, 'end');
    md.focus();
    md.dispatchEvent(new Event('input'));
  }
  document.querySelectorAll('.md-toolbar [data-md]').forEach((b) =>
    b.addEventListener('click', () => {
      const lineStart = md.value.lastIndexOf('\n', md.selectionStart - 1) + 1;
      md.setSelectionRange(lineStart, lineStart);
      insert(b.dataset.md);
    })
  );
  document.querySelectorAll('.md-toolbar [data-wrap]').forEach((b) =>
    b.addEventListener('click', () => insert(b.dataset.wrap, b.dataset.wrap, 'text'))
  );
  $('.md-toolbar [data-link]')?.addEventListener('click', () => {
    const url = prompt('Link URL (https://…)');
    if (url) insert('[', `](${url})`, 'link text');
  });

  $('[data-inline-image]')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const alt = prompt('Describe the image (for readers using screen readers and for Google):', '') || '';
    const fd = new FormData();
    fd.append('csrf', csrf);
    fd.append('image', file);
    const res = await fetch('/admin/upload-image', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error || 'Upload failed');
    insert(`\n![${alt.replace(/[[\]]/g, '')}](${data.url})\n`);
    e.target.value = '';
  });

  // ---------- counters + SEO checklist ----------
  function counter(id, limit) {
    const el = document.getElementById(id);
    const out = document.querySelector(`[data-counter-for="${id}"]`);
    if (!el || !out) return;
    const update = () => { out.textContent = `${el.value.length}/${limit}`; out.style.color = el.value.length > limit ? 'var(--color-destructive)' : ''; };
    el.addEventListener('input', update);
    update();
  }
  counter('meta_title', 60);
  counter('meta_desc', 155);

  const checklist = $('#seo-checklist');
  function check() {
    const words = md.value.trim().split(/\s+/).filter(Boolean).length;
    const h2 = (md.value.match(/^##\s/gm) || []).length;
    const items = [
      [$('#title').value.length >= 20 && $('#title').value.length <= 70, 'Title is 20–70 characters'],
      [$('#summary').value.trim().length >= 60, 'One-minute summary written'],
      [words >= 300 || $('#video_url').value || $('#type').value === 'discussion', `Enough content (${words} words)`],
      [h2 >= 2, 'At least 2 section headings (##)'],
      [$('#sources').value.trim().length > 0 || $('#fact_status').value === 'opinion', 'Sources listed'],
      [($('#meta_desc').value.length >= 120 && $('#meta_desc').value.length <= 160) || $('#summary').value.length >= 120, 'Meta description 120–160 chars'],
      [!$('#cover_file').files.length || $('#cover_alt').value.trim().length > 0, 'Cover image has alt text'],
      [!/\[VERIFY:/i.test(md.value), 'No [VERIFY: …] placeholders left'],
    ];
    checklist.innerHTML = items.map(([ok, text]) => `<li class="${ok ? 'ok' : ''}">${text}</li>`).join('');
  }
  form.addEventListener('input', check);
  form.addEventListener('change', check);
  check();

  // warn before publishing with unverified placeholders
  form.addEventListener('submit', (e) => {
    if (e.submitter?.value === 'publish' && /\[VERIFY:/i.test(md.value) && !confirm('This post still has [VERIFY: …] placeholders. Publish anyway?')) e.preventDefault();
  });

  // ---------- AI drafting ----------
  const go = $('#ai-go');
  const status = $('#ai-status');
  go?.addEventListener('click', async () => {
    const topic = $('#ai-topic').value.trim();
    if (topic.length < 4) { status.textContent = 'Describe the topic first.'; $('#ai-topic').focus(); return; }
    if ((md.value.trim() || $('#title').value.trim()) && !confirm('Replace the current title and content with an AI draft?')) return;

    go.disabled = true;
    status.textContent = 'Writing your draft… this usually takes 20–60 seconds.';
    try {
      const res = await fetch('/admin/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
        body: JSON.stringify({
          topic,
          lang: $('#ai-lang').value,
          type: $('#ai-type').value,
          tone: $('#ai-tone').value,
          words: $('#ai-words').value,
          notes: $('#ai-notes').value,
        }),
      });
      const data = await res.json().catch(() => ({ error: 'Unexpected response from server.' }));
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      $('#title').value = data.title || '';
      $('#summary').value = data.summary || '';
      md.value = data.content_md || '';
      $('#meta_desc').value = (data.meta_description || '').slice(0, 170);
      $('#tags').value = (data.tags || []).join(', ');
      if (data.category) $('#category').value = data.category;
      $('#lang').value = $('#ai-lang').value;
      $('#type').value = $('#ai-type').value;
      $('#slug').value = '';
      $('#ai_assisted').checked = true;
      $('#fact_status').value = 'unverified';

      const box = $('#ai-verify');
      const list = box.querySelector('ul');
      list.innerHTML = '';
      (data.facts_to_verify || []).forEach((f) => { const li = document.createElement('li'); li.textContent = f; list.appendChild(li); });
      box.hidden = !(data.facts_to_verify || []).length;

      status.textContent = 'Draft ready. Read it, check the facts, add your own experience, then publish.';
      form.dispatchEvent(new Event('input'));
      $('#meta_desc').dispatchEvent(new Event('input'));
    } catch (err) {
      status.textContent = err.message;
    } finally {
      go.disabled = false;
    }
  });
})();
