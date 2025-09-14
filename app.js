'use strict';

(function () {
  // Hardcoded credentials
  const VALID_CREDENTIALS = { username: 'test', password: 'test123' };
  const SESSION_KEY = 'qa_demo_session_v1';

  // Elements
  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');

  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('login-error');
  const loginInfo = document.getElementById('login-info');

  const whoami = document.getElementById('whoami');
  const logoutButton = document.getElementById('logout-button');

  const demoForm = document.getElementById('demo-form');
  const formMessage = document.getElementById('form-message');
  const sessionStatus = document.getElementById('session-status');

  // Session helpers
  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(session) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (e) {
      // ignore
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      // ignore
    }
  }

  function isAuthenticated() {
    const s = getSession();
    return Boolean(s && s.loggedIn === true);
  }

  // Views
  function showLogin(message) {
    dashboardView.hidden = true;
    loginView.hidden = false;
    if (message) {
      loginInfo.textContent = message;
    } else {
      loginInfo.textContent = '';
    }
    loginError.textContent = '';
    usernameInput.focus();
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    const s = getSession();
    whoami.textContent = s && s.user ? 'Signed in as ' + s.user : '';
    sessionStatus.hidden = true;
    formMessage.textContent = '';
  }

  function initialRender() {
    if (isAuthenticated()) {
      showDashboard();
    } else {
      showLogin();
    }
  }

  // Event wiring
  document.addEventListener('DOMContentLoaded', function () {
    initialRender();

    // Login submit
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const u = usernameInput.value.trim();
      const p = passwordInput.value;
      if (u === VALID_CREDENTIALS.username && p === VALID_CREDENTIALS.password) {
        setSession({ loggedIn: true, user: u, ts: Date.now() });
        showDashboard();
      } else {
        loginError.textContent = 'Invalid credentials. Use test / test123';
      }
    });

    // Logout button
    logoutButton.addEventListener('click', function () {
      clearSession();
      showLogin('You have been logged out.');
    });

    // Demo form submit
    demoForm.addEventListener('submit', function (e) {
      e.preventDefault();
      // Always re-check auth at submit time to support cross-tab logout
      if (!isAuthenticated()) {
        showLogin('Session expired. Please sign in again.');
        return;
      }
      const color = /** @type {HTMLInputElement} */ (document.getElementById('color')).value.trim();
      formMessage.textContent = color ? 'Submitted: ' + color : 'Submitted.';
    });

    // Cross-tab sync: listen to storage events
    window.addEventListener('storage', function (event) {
      if (event.key !== SESSION_KEY) return;
      // If session removed or changed to loggedOut, surface a banner but do not auto-redirect
      const authed = isAuthenticated();
      if (!authed) {
        // Only show the banner if user is on dashboard
        if (!dashboardView.hidden) {
          sessionStatus.hidden = false;
        }
      } else {
        sessionStatus.hidden = true;
      }
    });
  });
})();


