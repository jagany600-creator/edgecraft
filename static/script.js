// =========================================================
// UNIVERSAL PROFILE & AVATAR SYNC ACROSS ALL SIDEBARS
// =========================================================
function syncSidebarProfile() {
  const profileRaw = localStorage.getItem('edgecraft_user_profile');
  if (!profileRaw) return;

  try {
    const profile = JSON.parse(profileRaw);
    if (!profile) return;

    // 1. Sync Avatar Image
    if (profile.avatar) {
      const existingImgs = document.querySelectorAll(
        '.user-card-inner img, .avatar-box img, aside.sidebar a[href*="settings"] img, #sidebarUserAvatar'
      );

      if (existingImgs.length > 0) {
        existingImgs.forEach(img => { img.src = profile.avatar; });
      } else {
        const avatarBox = document.querySelector('.avatar-box, .user-card-inner > div:first-child');
        if (avatarBox) {
          avatarBox.innerHTML = `<img src="${profile.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="Avatar">`;
        }
      }
    }

    // 2. Sync Display Name
    const name = profile.fullName || profile.username || 'JAGAN';
    document.querySelectorAll('.global-sidebar-name, .user-name span:first-child').forEach(el => {
      el.textContent = name;
    });
  } catch (err) {
    console.error('Profile sync error:', err);
  }
}

// Execute immediately, on DOM ready, and on window load
syncSidebarProfile();
document.addEventListener('DOMContentLoaded', syncSidebarProfile);
window.addEventListener('load', syncSidebarProfile);

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      if (eyeIcon) {
        eyeIcon.innerHTML = isPassword 
          ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>'
          : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
      }
    });
  }

  // 3D Parallax Mouse Tracking Effect for Bull
  const wrapper = document.querySelector('.login-wrapper');
  const bull3D = document.getElementById('bullWrapper');

  if (wrapper && bull3D) {
    wrapper.addEventListener('mousemove', (e) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const rotateX = ((clientY / innerHeight) - 0.5) * -12;
      const rotateY = ((clientX / innerWidth) - 0.5) * 12;
      bull3D.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });

    wrapper.addEventListener('mouseleave', () => {
      bull3D.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  }

  // Auth Mode State (login / register)
  let isLoginMode = true;

  const toggleAuthModeBtn = document.getElementById('toggleAuthMode');
  const formTitle = document.getElementById('formTitle');
  const formSubHeader = document.getElementById('formSubHeader');
  const submitBtn = document.getElementById('submitBtn');
  const forgotPassWrapper = document.getElementById('forgotPassWrapper');
  const toggleText = document.getElementById('toggleText');

  if (toggleAuthModeBtn) {
    toggleAuthModeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      isLoginMode = !isLoginMode;

      if (isLoginMode) {
        formTitle.innerHTML = `Welcome <span class="green-text">Back!</span>`;
        formSubHeader.textContent = 'Login to continue your trading journey.';
        submitBtn.querySelector('span').textContent = 'Login';
        if (forgotPassWrapper) forgotPassWrapper.style.display = 'block';
        if (toggleText) toggleText.textContent = "Don't have an account?";
        toggleAuthModeBtn.textContent = 'Create Account';
      } else {
        formTitle.innerHTML = `Join <span class="green-text">EdgeCraft</span>`;
        formSubHeader.textContent = 'Create an account to start tracking your trades.';
        submitBtn.querySelector('span').textContent = 'Register Account';
        if (forgotPassWrapper) forgotPassWrapper.style.display = 'none';
        if (toggleText) toggleText.textContent = 'Already have an account?';
        toggleAuthModeBtn.textContent = 'Login Here';
      }
    });
  }

  // Form Submission (/api/login or /api/register)
  const authForm = document.getElementById('authForm');
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const endpoint = isLoginMode ? '/api/login' : '/api/register';

      submitBtn.disabled = true;
      submitBtn.querySelector('span').textContent = isLoginMode ? 'Authenticating...' : 'Creating Account...';

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
          if (isLoginMode) {
            alert(`Welcome back, ${data.user.username}!`);
            window.location.href = '/dashboard';
          } else {
            alert('Account created successfully! Switching to login...');
            toggleAuthModeBtn.click();
          }
        } else {
          alert(`Error: ${data.error}`);
        }
      } catch (err) {
        console.error('API Error:', err);
        alert('Server error. Check if Flask backend is running.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = isLoginMode ? 'Login' : 'Register Account';
      }
    });
  }

  // Google Login Button Click
  const googleBtn = document.getElementById('googleBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      googleBtn.disabled = true;
      googleBtn.style.opacity = '0.7';

      try {
        const response = await fetch('/api/google-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: 'demo-google-token' })
        });

        const data = await response.json();

        if (response.ok) {
          alert(`Google Auth Successful! Welcome, ${data.user.username}`);
          window.location.href = '/dashboard';
        } else {
          alert(`Google Login Failed: ${data.error}`);
        }
      } catch (err) {
        console.error('Google Auth Error:', err);
        alert('Server error during Google login.');
      } finally {
        googleBtn.disabled = false;
        googleBtn.style.opacity = '1';
      }
    });
  }
});