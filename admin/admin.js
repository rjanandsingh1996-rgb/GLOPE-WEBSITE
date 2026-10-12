(async function () {
  const auth = document.getElementById('auth-status');
  const db = document.getElementById('db-status');
  const copy = document.getElementById('status-copy');
  auth.textContent = 'Verified by Cloudflare Access';
  try {
    const response = await fetch('/api/admin/health', { method: 'GET', credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' } });
    const result = await response.json();
    if (response.ok && result.database === 'connected') {
      db.textContent = 'Connected';
      copy.textContent = 'Secure access is active and the database connection is working.';
    } else if (result.database === 'not_configured') {
      db.textContent = 'Setup required';
      copy.textContent = 'Access is working. The D1 database still needs to be created and connected.';
    } else {
      db.textContent = 'Check required';
      copy.textContent = 'Access is working, but the database connection needs attention.';
    }
  } catch {
    db.textContent = 'Unavailable';
    copy.textContent = 'Could not verify the database. Check the Worker deployment and D1 binding.';
  }
})();
