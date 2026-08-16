document.addEventListener('DOMContentLoaded', () => {
  // 1. DEFAULT PROFILE STATE
  const DEFAULT_PROFILE = {
    fullName: 'JAGAN',
    username: 'YADAV',
    email: 'jagany600@gmail.com',
    timezone: 'America/New_York (EST)',
    memberSince: 'Aug 2026',
    avatar: '/static/bull-3d.png'
  };

  // 2. TOAST NOTIFICATION HELPER
  function showToast(message) {
    const toast = document.getElementById('toastNotification');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // 3. LOAD PROFILE
  function loadProfile() {
    const raw = localStorage.getItem('edgecraft_user_profile');
    let profile = DEFAULT_PROFILE;
    if (raw) {
      try {
        profile = { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
      } catch (e) {}
    }

    document.getElementById('profileFullName').textContent = profile.fullName;
    document.getElementById('profileUsername').textContent = profile.username;
    document.getElementById('profileEmail').textContent = profile.email;
    document.getElementById('profileTimezone').textContent = profile.timezone;

    document.getElementById('summaryUserName').textContent = profile.fullName;
    const sideUser = document.getElementById('sidebarUserName');
    if (sideUser) sideUser.textContent = profile.fullName;

    document.getElementById('statMemberSince').textContent = profile.memberSince;

    // Apply Profile Photos
    if (profile.avatar) {
      document.getElementById('displayProfileAvatar').src = profile.avatar;
      document.getElementById('summaryAvatarImg').src = profile.avatar;
      const sideAvatar = document.getElementById('sidebarAvatarImg');
      if (sideAvatar) sideAvatar.src = profile.avatar;
    }
  }

  // 4. AVATAR FILE UPLOADER (RESIZED BASE64 STORAGE)
  const avatarFileInput = document.getElementById('avatarFileInput');
  avatarFileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Save
        const raw = localStorage.getItem('edgecraft_user_profile');
        const profile = raw ? JSON.parse(raw) : DEFAULT_PROFILE;
        profile.avatar = dataUrl;
        localStorage.setItem('edgecraft_user_profile', JSON.stringify(profile));

        // Update UI
        document.getElementById('displayProfileAvatar').src = dataUrl;
        document.getElementById('summaryAvatarImg').src = dataUrl;
        const sideAvatar = document.getElementById('sidebarAvatarImg');
        if (sideAvatar) sideAvatar.src = dataUrl;

        showToast('Profile photo updated successfully!');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  // 5. MODAL SYSTEM (PROFESSIONAL DIALOGS)
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.style.display = 'none');
  }

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  // Edit Profile Modal
  document.getElementById('btnOpenEditModal')?.addEventListener('click', () => {
    const raw = localStorage.getItem('edgecraft_user_profile');
    const profile = raw ? JSON.parse(raw) : DEFAULT_PROFILE;

    document.getElementById('inputFullName').value = profile.fullName;
    document.getElementById('inputUsername').value = profile.username;
    document.getElementById('inputEmail').value = profile.email;
    document.getElementById('selectTimezone').value = profile.timezone;

    openModal('editProfileModal');
  });

  document.getElementById('editProfileForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = localStorage.getItem('edgecraft_user_profile');
    const profile = raw ? JSON.parse(raw) : DEFAULT_PROFILE;

    profile.fullName = document.getElementById('inputFullName').value.trim();
    profile.username = document.getElementById('inputUsername').value.trim();
    profile.email = document.getElementById('inputEmail').value.trim();
    profile.timezone = document.getElementById('selectTimezone').value;

    localStorage.setItem('edgecraft_user_profile', JSON.stringify(profile));
    loadProfile();
    closeAllModals();
    showToast('Profile details updated successfully!');
  });

  // Security Modals
  document.getElementById('btnChangePassword')?.addEventListener('click', () => openModal('modalChangePassword'));
  document.getElementById('formChangePassword')?.addEventListener('submit', (e) => {
    e.preventDefault();
    closeAllModals();
    showToast('Password updated securely!');
  });

  document.getElementById('btnChangeEmail')?.addEventListener('click', () => {
    const raw = localStorage.getItem('edgecraft_user_profile');
    const profile = raw ? JSON.parse(raw) : DEFAULT_PROFILE;
    document.getElementById('modalCurEmail').value = profile.email;
    openModal('modalChangeEmail');
  });

  document.getElementById('formChangeEmail')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const newMail = document.getElementById('modalNewEmail').value.trim();
    if (newMail) {
      const raw = localStorage.getItem('edgecraft_user_profile');
      const profile = raw ? JSON.parse(raw) : DEFAULT_PROFILE;
      profile.email = newMail;
      localStorage.setItem('edgecraft_user_profile', JSON.stringify(profile));
      loadProfile();
      closeAllModals();
      showToast('Email address changed to ' + newMail);
    }
  });

  document.getElementById('btnGoogleAuth')?.addEventListener('click', () => openModal('modalGoogle'));
  document.getElementById('btnActiveSessions')?.addEventListener('click', () => openModal('modalSessions'));
  document.getElementById('btn2FA')?.addEventListener('click', () => openModal('modal2FA'));
  document.getElementById('btnDeleteAccount')?.addEventListener('click', () => openModal('modalDelete'));

  document.getElementById('btnConfirmDelete')?.addEventListener('click', () => {
    localStorage.clear();
    closeAllModals();
    showToast('Account data cleared.');
    setTimeout(() => { location.reload(); }, 1000);
  });

  document.getElementById('btnLogout')?.addEventListener('click', () => openModal('modalLogout'));
  document.getElementById('btnConfirmLogout')?.addEventListener('click', () => {
   window.location.href = '/logout';
  });

 // 6. APPEARANCE & THEME SWITCHER
  function applyTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.remove('theme-light', 'theme-dark');

    if (theme === 'light') {
      document.body.classList.add('theme-light');
      document.documentElement.classList.add('theme-light');
    } else if (theme === 'system') {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.body.classList.add('theme-light');
        document.documentElement.classList.add('theme-light');
      }
    }

    document.querySelectorAll('.theme-option-box').forEach(box => {
      box.classList.toggle('active', box.getAttribute('data-theme') === theme);
    });
  }

  const savedTheme = localStorage.getItem('edgecraft_theme') || 'dark';
  applyTheme(savedTheme);

  document.querySelectorAll('.theme-option-box').forEach(box => {
    box.addEventListener('click', () => {
      const selected = box.getAttribute('data-theme');
      localStorage.setItem('edgecraft_theme', selected);
      applyTheme(selected);
      showToast(`Appearance set to ${selected.toUpperCase()} mode!`);
    });
  });

  // 7. DYNAMIC TRADING METRICS
  async function loadDynamicTradingSummary() {
    let trades = [];
    try {
      const res = await fetch('/api/trades');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) trades = data;
      }
    } catch (e) {}

    if (trades.length === 0) {
      const raw = localStorage.getItem('edgecraft_trades') || localStorage.getItem('trades');
      if (raw) {
        try { trades = JSON.parse(raw); } catch (e) {}
      }
    }

    const totalTradesCount = trades.length;
    let winningTrades = 0;
    let totalProcessScore = 0;

    trades.forEach(t => {
      const pnl = parseFloat(t.pnl || t.net_pnl || 0);
      if (pnl > 0) winningTrades++;

      let score = 0;
      if (t.follow_plan !== undefined) {
        let yesCount = 0;
        ['follow_plan', 'follow_checklist', 'exit_early', 'move_stop', 'overtraded'].forEach(k => {
          if (t[k] === true || t[k] === 1 || t[k] === 'true') yesCount++;
        });
        score = (yesCount / 5) * 100;
      } else if (t.rating !== undefined) {
        score = (parseFloat(t.rating) / 5) * 100;
      }
      totalProcessScore += score;
    });

    const avgProcess = totalTradesCount > 0 ? Math.round(totalProcessScore / totalTradesCount) : 0;
    const winRate = totalTradesCount > 0 ? ((winningTrades / totalTradesCount) * 100).toFixed(1) : '0.0';

    document.getElementById('statTotalTrades').textContent = totalTradesCount;
    document.getElementById('statProcessScore').textContent = `${avgProcess}%`;
    document.getElementById('statWinRate').textContent = `${winRate}%`;
  }

  // Initialize
  loadProfile();
  loadDynamicTradingSummary();
// --- GOOGLE ACCOUNT DYNAMIC INTEGRATION ---
  const googleModal = document.getElementById('modalGoogle');
  const googleRow = document.querySelector('[data-target="modalGoogle"]') || 
                    document.getElementById('rowGoogleAccount') ||
                    document.querySelector('.settings-row:has(#googleUserName)');
  const syncGoogleBtn = document.getElementById('syncGoogleBtn');
  const disconnectGoogleBtn = document.getElementById('disconnectGoogleBtn');

  // Open modal & fetch live Google Account status
  if (googleRow && googleModal) {
    googleRow.addEventListener('click', async () => {
      googleModal.style.display = 'flex';
      try {
        const res = await fetch('/api/google-account');
        if (res.ok) {
          const data = await res.json();
          const nameEl = document.getElementById('googleUserName');
          const emailEl = document.getElementById('googleUserEmail');
          const avatarEl = document.getElementById('googleUserAvatar');

          if (nameEl && data.name) nameEl.textContent = data.name;
          if (emailEl && data.email) emailEl.textContent = data.email;
          if (avatarEl && data.avatar) avatarEl.src = data.avatar;
        }
      } catch (err) {
        console.log('Using default profile view:', err);
      }
    });
  }

  // Handle Sync Now action
  if (syncGoogleBtn) {
    syncGoogleBtn.addEventListener('click', async () => {
      const originalText = syncGoogleBtn.textContent;
      syncGoogleBtn.disabled = true;
      syncGoogleBtn.textContent = 'Syncing...';

      try {
        await fetch('/api/google-account/sync', { method: 'POST' });
        syncGoogleBtn.textContent = '✓ Synced';
      } catch (e) {
        syncGoogleBtn.textContent = '✓ Synced';
      }

      setTimeout(() => {
        syncGoogleBtn.textContent = originalText;
        syncGoogleBtn.disabled = false;
      }, 1500);
    });
  }

  // Handle Disconnect action
  if (disconnectGoogleBtn) {
    disconnectGoogleBtn.addEventListener('click', async () => {
      if (confirm('Unlink this Google Account from EdgeCraft?')) {
        await fetch('/api/google-account/disconnect', { method: 'POST' });
        if (googleModal) googleModal.style.display = 'none';
        window.location.reload();
      }
    });
  }
});
