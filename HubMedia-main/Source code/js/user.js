document.addEventListener('DOMContentLoaded', () => {
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    const nameEl = document.querySelector('.user-name');
    const avatarImg = document.querySelector('.sidebar-avatar-img');

    if (user) {
      if (nameEl) nameEl.textContent = user.full_name || user.username || user.email || 'User';
      if (avatarImg) avatarImg.src = user.avatar_url || user.avatar || 'img/default-avatar.svg';
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        localStorage.removeItem('user');
        // Attempt to notify backend (best-effort)
        try { await fetch('http://localhost:3000/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) {}
        window.location.href = 'login.html';
      });
    }
  } catch (err) {
    console.error(err);
  }
});
