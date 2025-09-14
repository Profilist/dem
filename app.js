'use strict';

(function () {
  // Hardcoded credentials
  const VALID_CREDENTIALS = { username: 'test', password: 'test123' };
  const BROADCAST_KEY = 'qa_demo_broadcast_v1';
  // In-memory session (does not survive reload)
  let inMemorySession = { loggedIn: false, user: null };

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

  // Session helpers (memory only)
  function getSession() {
    return inMemorySession;
  }

  function broadcast(type, data) {
    try {
      const payload = JSON.stringify({ type: type, data: data || null, ts: Date.now() });
      // Write a unique value to trigger storage event in other tabs
      localStorage.setItem(BROADCAST_KEY, payload);
    } catch (e) {
      // ignore
    }
  }

  function setSession(session) {
    inMemorySession = session || { loggedIn: false, user: null };
    broadcast('login', { user: inMemorySession.user });
  }

  function clearSession() {
    inMemorySession = { loggedIn: false, user: null };
    broadcast('logout');
  }

  function isAuthenticated() {
    return Boolean(inMemorySession && inMemorySession.loggedIn === true);
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

    // Cross-tab sync: listen to broadcast events
    window.addEventListener('storage', function (event) {
      if (event.key !== BROADCAST_KEY) return;
      try {
        const payload = event.newValue ? JSON.parse(event.newValue) : null;
        if (!payload) return;
        if (payload.type === 'logout') {
          // Force local memory session to logged out
          inMemorySession = { loggedIn: false, user: null };
          // Show banner if on dashboard
          if (!dashboardView.hidden) {
            sessionStatus.hidden = false;
          }
        }
      } catch (e) {
        // ignore
      }
    });
  });
})();


