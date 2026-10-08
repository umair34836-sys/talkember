// "Deploy site" button in the admin bar: builds the static site and pushes it to GitHub.
(() => {
  const btn = document.getElementById('deploy-btn');
  if (!btn) return;
  const box = document.getElementById('deploy-box');
  const status = document.getElementById('deploy-status');
  const log = document.getElementById('deploy-log');

  btn.addEventListener('click', async () => {
    if (!confirm('Publish the current site to GitHub now?')) return;
    btn.disabled = true;
    box.hidden = false;
    box.className = 'container deploy-box';
    status.textContent = 'Deploying… building pages and pushing to GitHub. If a GitHub sign-in window opens, complete it.';
    log.textContent = '';
    try {
      const res = await fetch('/admin/deploy', { method: 'POST', headers: { 'x-csrf-token': btn.dataset.csrf } });
      const data = await res.json().catch(() => ({ ok: false, log: `Server returned ${res.status}` }));
      log.textContent = data.log || '';
      box.classList.add(data.ok ? 'deploy-ok' : 'deploy-err');
      status.textContent = data.ok
        ? 'Done! The site is pushed to GitHub — it will be live in 1–2 minutes.'
        : 'Deploy failed. Open “Details” to see why.';
    } catch {
      box.classList.add('deploy-err');
      status.textContent = 'Could not reach the local server. Is it still running?';
    } finally {
      btn.disabled = false;
    }
  });
})();
