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

  core.getCurrentUser = async function () {
  const { data: { user } } = await window.supabase.auth.getUser();
  return user;
};
core.getUserEmail = async function () {
  const user = await core.getCurrentUser();
  return user?.email ?? null;
};

 core.updateHeaderUI = async function () {
  const logged = await core.isLoggedIn();
  const logoutBtn = document.getElementById('logoutBtn');
  const accountLink = document.getElementById('accountLink');

  // 1. Auth UI
  if (logoutBtn) logoutBtn.style.display = logged ? 'inline-block' : 'none';
  if (accountLink) {
    accountLink.textContent = logged ? 'ACCOUNT' : 'SIGN UP';
    accountLink.href = logged ? 'account.html' : 'login.html';  // <-- fixed href
  }

  // 2. Active page – EXACT MATCH + CLEAN PREVIOUS
  const currentPage = location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('nav a').forEach(a => {
    const href = a.getAttribute('href');
    const isActive = href === currentPage;

    // Remove active from all first
    a.classList.remove('active');

    // Add only to the matching one
    if (isActive) a.classList.add('active');

    // Hide protected links for guests
    const isPublic = ['index.html', 'login.html', 'contact.html'].includes(href);
    a.style.display = (!logged && !isPublic) ? 'none' : '';
  });

  // Fade in logout
  if (logged && logoutBtn && logoutBtn.style.display === 'inline-block') {
    logoutBtn.style.opacity = '0';
    logoutBtn.style.transition = 'opacity 0.25s ease';
    requestAnimationFrame(() => logoutBtn.style.opacity = '1');
  }
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
    await core.waitForAuthReady();
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

// Run header update EVEN BEFORE auth is ready – it will correct itself in <100ms
document.addEventListener('DOMContentLoaded', () => {
  core.updateHeaderUI().catch(() => {}); // fire-and-forget
});

// ====== STREAK BADGE – GLOBAL (runs on every page) ======
async function updateStreakBadge() {
  const badge = document.getElementById("streakBadge");
  const countEl = document.getElementById("streakCount");
  const emojiEl = document.getElementById("streakEmoji");

  if (!badge || !countEl || !emojiEl) return;

  const user = window.supabase.auth.getUser();
  if (!user) {
    badge.style.display = "none";
    return;
  }

  try {
    const { data: entries } = await window.supabase
      .from('journal_entries')
      .select('created_at')
      .order('created_at', { ascending: false });

    if (!entries || entries.length === 0) {
      badge.style.display = "none";
      return;
    }

    const dates = [...new Set(entries.map(e => e.created_at.split('T')[0]))].sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      if (dates[i] === expected) streak++;
      else break;
    }

    // Show badge
    badge.style.display = "block";
    countEl.textContent = streak;

    // Dynamic emoji & message
    if (streak >= 30) {
      emojiEl.textContent = "Legendary streak!";
      badge.style.background = "linear-gradient(90deg, #FFB3B3, #A7D8A7)";
    } else if (streak >= 14) {
      emojiEl.textContent = "On fire";
      badge.style.background = "linear-gradient(90deg, #FF8C42, #A7D8A7)";
    } else if (streak >= 7) {
      emojiEl.textContent = "On fire";
    } else if (streak >= 3) {
      emojiEl.textContent = "Sparkles";
    } else {
      emojiEl.textContent = "Seedling";
    }

  } catch (err) {
    console.error("Streak badge error:", err);
    badge.style.display = "none";
  }
}

// Run on login + page load
window.core?.onReady?.(() => {
  updateStreakBadge();
  // Optional: refresh every 5 minutes
  setInterval(updateStreakBadge, 5 * 60 * 1000);
});
