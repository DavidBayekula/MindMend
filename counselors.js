// counselors.js
let COUNSELORS = [];

// Fetch JSON helper
async function fetchJSON(url, fallback) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Bad status");
    return await res.json();
  } catch (e) {
    console.warn("Failed to load counselors:", e);
    return fallback;
  }
}

// Load counselors from JSON
async function loadCounselors() {
  const data = await fetchJSON('counselors.json', []);
  COUNSELORS = Array.isArray(data) ? data : [];
  return COUNSELORS;
}

function wireCounselorSearch() {
  const nameEl = document.getElementById('counselorName');
  const univEl = document.getElementById('counselorUniv');
  const stateEl = document.getElementById('counselorState');
  const btn = document.getElementById('searchBtn');
  const out = document.getElementById('counselorResults');
  const label = document.getElementById('resultsFor');

  if (!nameEl || !univEl || !stateEl || !btn || !out) {
    console.error("Counselor search elements not found");
    return;
  }

  function render(list, qName, qUniv, qState) {
    // Update label
    if (label) {
      const parts = [];
      if (qName) parts.push(`name: “${qName}”`);
      if (qUniv) parts.push(`university: “${qUniv}”`);
      if (qState) parts.push(`state: ${qState}`);
      label.style.display = parts.length ? 'block' : 'none';
      if (parts.length) {
        label.textContent = "Showing results for " + parts.join(" • ");
      }
    }

    out.innerHTML = '';
    if (!list.length) {
      out.innerHTML = `<p class="muted" style="margin-top:12px">No counselors matched your search.</p>`;
      return;
    }

    list.forEach(c => {
      const card = document.createElement('div');
      card.className = 'c-card';
      card.innerHTML = `
        <div class="c-avatar" aria-hidden="true"></div>
        <div>
          <div style="font-weight:700;font-size:20px">${escapeHTML(c.name)}</div>
          <div class="muted">${escapeHTML(c.university)} • ${escapeHTML(c.state)}</div>
          <p class="muted" style="margin:8px 0 0">${escapeHTML(c.summary)}</p>
          <div style="display:flex;gap:16px;margin-top:10px;align-items:center;color:#4b4b4b;flex-wrap:wrap">
            <a href="mailto:${escapeHTML(c.email)}">Email ${escapeHTML(c.email)}</a>
            <a href="tel:${c.phone.replace(/[^0-9]/g,'')}">Call ${escapeHTML(c.phone)}</a>
          </div>
        </div>
        <a class="chip" href="${escapeHTML(c.linkUrl)}" target="_blank" rel="noopener">${escapeHTML(c.linkText)}</a>`;
      out.appendChild(card);
    });
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function filter() {
    const qName = (nameEl.value || '').trim().toLowerCase();
    const qUniv = (univEl.value || '').trim().toLowerCase();
    const qState = stateEl.value;

    const results = COUNSELORS.filter(c => {
      const nameOk = !qName || c.name.toLowerCase().includes(qName);
      const univOk = !qUniv || c.university.toLowerCase().includes(qUniv);
      const stateOk = !qState || c.state === qState;
      return nameOk && univOk && stateOk;
    });

    render(results, nameEl.value.trim(), univEl.value.trim(), qState || '');
  }

  // Initial load
  async function init() {
    await loadCounselors();
    render(COUNSELORS, '', '', '');
    filter(); // Apply default (all)
  }

  // Event Listeners
  btn.addEventListener('click', filter);
  [nameEl, univEl, stateEl].forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') filter(); });
    el.addEventListener('input', () => {
      if (!nameEl.value && !univEl.value && !stateEl.value) filter();
    });
  });
  stateEl.addEventListener('change', filter);

  // Start
  init();
}

// Only wire on counselor.html
document.addEventListener('DOMContentLoaded', () => {
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (path === 'counselor.html') {
    wireCounselorSearch();
  }
});