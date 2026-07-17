// Painel de Guias — autenticação por sessão em cookie HttpOnly.
// Le cookie voyage automatiquement (fetch same-origin) ; le token CSRF est gardé
// UNIQUEMENT en mémoire pendant la vie de la page (jamais localStorage/sessionStorage)
// et sera envoyé en header x-csrf-token par les futures routes d'écriture.

(() => {
  'use strict';

  const stateLoading = document.getElementById('state-loading');
  const stateLogin = document.getElementById('state-login');
  const statePanel = document.getElementById('state-panel');
  const form = document.getElementById('login-form');
  const passwordInput = document.getElementById('login-password');
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');

  let csrfToken = null; // mantido apenas em memória

  function show(state) {
    stateLoading.classList.add('hidden');
    stateLogin.classList.add('hidden');
    statePanel.classList.add('hidden');
    state.classList.remove('hidden');
  }

  function showError(message) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
  }

  function clearError() {
    loginError.textContent = '';
    loginError.classList.add('hidden');
  }

  async function checkSession() {
    try {
      const res = await fetch('/api/admin-session', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        csrfToken = data.csrfToken || null;
        show(statePanel);
        return;
      }
    } catch {
      // erro de rede: cai para a tela de login
    }
    csrfToken = null;
    show(stateLogin);
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (loginBtn.disabled) return; // proteção contra clique repetido
    clearError();
    loginBtn.disabled = true;
    const originalLabel = loginBtn.textContent;
    loginBtn.textContent = 'Entrando…';
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.value }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.authenticated) {
        csrfToken = data.csrfToken || null;
        passwordInput.value = '';
        show(statePanel);
      } else if (res.status === 429) {
        showError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
      } else {
        showError('Senha incorreta.');
      }
    } catch {
      showError('Erro de conexão. Tente novamente.');
    }
    loginBtn.disabled = false;
    loginBtn.textContent = originalLabel;
  });

  logoutBtn.addEventListener('click', async () => {
    logoutBtn.disabled = true;
    try {
      // Logout é rota de escrita: envia o token CSRF mantido em memória
      await fetch('/api/admin-logout', {
        method: 'POST',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
      });
    } catch {
      // mesmo com erro de rede, volta para o login — o cookie expira sozinho
    }
    csrfToken = null;
    logoutBtn.disabled = false;
    clearError();
    show(stateLogin);
  });

  checkSession();
})();
