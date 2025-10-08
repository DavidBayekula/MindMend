// core.js — auth, header, guard, and boot lifecycle
(function () {
  const core = {};

  // ----- Auth/session helpers -----
  core.waitForAuthReady = async function (timeout = 4000) {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (session) return session;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        sub?.unsubscribe?.();
        resolve(null);
      }, timeout);
      const { data: { subscription: sub } } = window.supabase.auth.onAuthStateChange((_event, s) => {
        if (s) {
          clearTimeout(timer);
          sub?.unsubscribe?.();
          resolve(s);
        }
      });
    });
  };

  core.getSession = async function () {
    const { data: { session } } = await window.supabase.auth.getSession();
    return session || null;
  };
  core.isLoggedIn = async function () { return !!(await core.getSession()); };

  // ----- Header/nav -----
  core.updateHeaderUI = async function () {
    const logged = await core.isLoggedIn();
    const logoutBtn = document.getElementById('logoutBtn');
    const accountLink = document.getElementById('accountLink');
    if (logoutBtn) logoutBtn.style.display = logged ? 'inline-block' : 'none';
    if (accountLink) accountLink.textContent = logged ? 'ACCOUNT' : 'SIGN UP';

    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('nav a').forEach(a => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      a.classList.toggle('active', href === path);
      const isPublic = href === 'index.html' || href === 'login.html';
      a.style.display = (!logged && !isPublic) ? 'none' : '';
    });
  };

  // ----- Route guard (only Home+Login are public) -----
  core.guard = async function () {
    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const isPublic = (path === 'index.html' || path === 'login.html');
    const logged = await core.isLoggedIn();
    if (!logged && !isPublic) { location.replace('login.html'); return false; }
    return true;
  };

  // ----- Auth actions + forms -----
  core.doSignup = async function (email, password, displayName) {
    const { error } = await window.supabase.auth.signUp({
      email, password, options: { data: { display_name: displayName || email } }
    });
    if (error) throw error;
  };
  core.doLogin = async function (email, password) {
    const { error } = await window.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };
  core.doLogout = async function () { await window.supabase.auth.signOut(); };

  core.wireAuthForms = function () {
    const loginForm  = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginUser  = document.getElementById('loginUser');
    const loginPass  = document.getElementById('loginPass');
    const loginMsg   = document.getElementById('loginMsg');
    const signupUser = document.getElementById('signupUser');
    const signupPass = document.getElementById('signupPass');
    const signupMsg  = document.getElementById('signupMsg');
    const tabLogin   = document.getElementById('tabLogin');
    const tabSignup  = document.getElementById('tabSignup');
    const logoutBtn  = document.getElementById('logoutBtn');

    function showLogin(){ if (!loginForm || !signupForm) return; loginForm.style.display='block'; signupForm.style.display='none'; }
    function showSignup(){ if (!loginForm || !signupForm) return; loginForm.style.display='none'; signupForm.style.display='block'; }
    tabLogin?.addEventListener('click', showLogin);
    tabSignup?.addEventListener('click', showSignup);

    signupForm?.addEventListener('submit', async (e)=>{
      e.preventDefault(); signupMsg.textContent='';
      try { await core.doSignup((signupUser?.value||'').trim(), (signupPass?.value||'').trim(), (signupUser?.value||'').trim()); signupMsg.textContent='Check your email to confirm, then log in.'; showLogin(); }
      catch(err){ signupMsg.textContent = err.message || 'Sign up failed'; }
    });
    loginForm?.addEventListener('submit', async (e)=>{
      e.preventDefault(); loginMsg.textContent='';
      try { await core.doLogin((loginUser?.value||'').trim(), (loginPass?.value||'').trim()); loginMsg.textContent='Welcome! Redirecting…'; location.href='index.html'; }
      catch(err){ loginMsg.textContent = err.message || 'Login failed'; }
    });
    logoutBtn?.addEventListener('click', async ()=>{ await core.doLogout(); location.href='login.html'; });
  };

  // ----- Ready lifecycle -----
  let ready = false, queue = [];
  core.onReady = function (cb) { if (ready) cb(); else queue.push(cb); };

  async function boot() {
    try {
      if (!window.supabase) throw new Error("Supabase not initialized");
    await core.waitForAuthReady();
    } catch (err) {
    console.warn("Core boot fallback:", err.message);
  }

    await core.updateHeaderUI();
    const ok = await core.guard();
    if (!ok) return;                  // redirected to login
    core.wireAuthForms();
    ready = true;
    queue.splice(0).forEach(fn => { try { fn(); } catch {} });
    document.dispatchEvent(new CustomEvent('core:ready'));
  }

  document.addEventListener('DOMContentLoaded', boot);
  window.core = core;
})();
