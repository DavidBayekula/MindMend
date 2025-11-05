
let COUNSELORS = [];

// Fetch JSON helper
async function fetchJSON(url, fallback) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Bad status");
    return await res.json();
  } catch {
    return fallback;
  }
}

async function wireCounselorSearch(){
  const nameEl = document.getElementById('counselorName');
  const stateEl = document.getElementById('counselorState');
  const univEl = document.getElementById('counselorUniv');
  const btn = document.getElementById('searchBtn');
  const out = document.getElementById('counselorResults');
  const label = document.getElementById('resultsFor');
  if(!nameEl || !stateEl || !univEl || !btn || !out) return;

  COUNSELORS = await fetchJSON('counselors.json', []);
  const universities = await fetchJSON('universities.json', {});

  // Populate state dropdown
  Object.keys(universities).sort().forEach(state => {
    const option = document.createElement('option');
    option.value = state;
    option.textContent = state;
    stateEl.appendChild(option);
  });

  let filteredCounselors = COUNSELORS;
  let currentPage = 1;
  const pageSize = 5;

  function renderPage(qName, qState, qUniv) {
    out.innerHTML = '';
    if(label){
      const has = (qName || qState || qUniv);
      label.style.display = has ? 'block' : 'none';
      if(has){
        const parts = [];
        if(qName) parts.push(`name: "${qName}"`);
        if(qState) parts.push(`state: "${qState}"`);
        if(qUniv) parts.push(`university: "${qUniv}"`);
        label.textContent = "Showing results for " + parts.join(" • ");
      }
    }
    if(!filteredCounselors.length){
      out.innerHTML = `<p class="muted" style="margin-top:12px">No counselors matched your search.</p>`;
      return;
    }

    const totalPages = Math.ceil(filteredCounselors.length / pageSize);
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filteredCounselors.length);
    const pageList = filteredCounselors.slice(start, end);
   
    pageList.forEach(c=>{
      const card = document.createElement('div');
      card.className = 'c-card';
      card.innerHTML = `
        <img class="c-avatar" src="https://uxwing.com/wp-content/themes/uxwing/download/peoples-avatars/avatar-icon.png" alt="Counselor profile" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTAiIGhlaWdodD0iOTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjkwIiBoZWlnaHQ9IjkwIiBmaWxsPSIjZGZlNWUxIiByeD0iNDUiLz48dGV4dCB4PSI0NSIgeT0iNTUiIGZvbnQtc2l6ZT0iNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5YWFhYWEiPuJ1wpc8L3RleHQ+PC9zdmc+';">
        <div>
          <div style="font-weight:700;font-size:20px">${c.name}</div>
          <div class="muted">${c.university}</div>
          <p class="muted" style="margin:8px 0 0">${c.summary}</p>
          <div style="display:flex;gap:16px;margin-top:10px;align-items:center;color:#4b4b4b;flex-wrap:wrap">
            <a href="mailto:${c.email}">📧 ${c.email}</a>
            <a href="tel:${c.phone.replace(/[^0-9]/g,'')}">📞 ${c.phone}</a>
          </div>
        </div>
        <a class="chip" href="${c.linkUrl}" target="_blank" rel="noopener">${c.linkText}</a>`;
      out.appendChild(card);
    });

    // Responsive Pagination
    if(totalPages > 1){
      const pagination = document.createElement('div');
      pagination.className = 'pagination';

      const prevBtn = document.createElement('button');
      prevBtn.innerHTML = 'Previous';
      prevBtn.disabled = currentPage === 1;
      prevBtn.addEventListener('click', () => {
        currentPage--;
        renderPage(qName, qState, qUniv);
        pagination.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

      const nextBtn = document.createElement('button');
      nextBtn.innerHTML = 'Next';
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.addEventListener('click', () => {
        currentPage++;
        renderPage(qName, qState, qUniv);
        pagination.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

      const pageInfo = document.createElement('span');
      pageInfo.className = 'page-info';
      pageInfo.textContent = `${start + 1}–${end} of ${filteredCounselors.length}`;

      // Mobile: Show only arrows
      // Tablet: Show arrows + page info
      // Desktop: Show arrows + full page numbers
      const pageNumbers = document.createElement('div');
      pageNumbers.className = 'page-numbers';

      const maxVisible = window.innerWidth < 640 ? 1 : window.innerWidth < 960 ? 3 : 5;
      const startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      const endPage = Math.min(totalPages, startPage + maxVisible - 1);

      if (startPage > 1) {
        const first = document.createElement('button');
        first.textContent = '1';
        first.addEventListener('click', () => { currentPage = 1; renderPage(qName, qState, qUniv); });
        pageNumbers.appendChild(first);
        if (startPage > 2) {
          const dots = document.createElement('span');
          dots.textContent = '...';
          dots.className = 'dots';
          pageNumbers.appendChild(dots);
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === currentPage ? 'active' : '';
        btn.addEventListener('click', () => { currentPage = i; renderPage(qName, qState, qUniv); });
        pageNumbers.appendChild(btn);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          const dots = document.createElement('span');
          dots.textContent = '...';
          dots.className = 'dots';
          pageNumbers.appendChild(dots);
        }
        const last = document.createElement('button');
        last.textContent = totalPages;
        last.addEventListener('click', () => { currentPage = totalPages; renderPage(qName, qState, qUniv); });
        pageNumbers.appendChild(last);
      }

      pagination.appendChild(prevBtn);
      pagination.appendChild(pageInfo);
      pagination.appendChild(pageNumbers);
      pagination.appendChild(nextBtn);
      out.appendChild(pagination);
    }
  }

  function filter(){
    const qName = (nameEl.value || '').trim().toLowerCase();
    const qState = (stateEl.value || '').trim();
    const qUniv = (univEl.value || '').trim();

    filteredCounselors = COUNSELORS.filter(c => {
      const nameOk = !qName || c.name.toLowerCase().includes(qName);
      let univOk = true;
      if (qUniv) {
        univOk = c.university.toLowerCase() === qUniv.toLowerCase();
      } else if (qState) {
        univOk = universities[qState]?.some(u => u.toLowerCase() === c.university.toLowerCase());
      }
      return nameOk && univOk;
    });
    currentPage = 1;
    renderPage(nameEl.value.trim(), qState, qUniv);
  }

  // Responsive handling
  window.addEventListener('resize', () => {
    if (filteredCounselors.length > pageSize) {
      renderPage(nameEl.value.trim(), stateEl.value, univEl.value);
    }
  });

  // State → University cascade
  stateEl.addEventListener('change', () => {
    const selectedState = stateEl.value;
    univEl.innerHTML = '<option value="">Any University</option>';
    if (selectedState && universities[selectedState]) {
      universities[selectedState].forEach(univ => {
        const option = document.createElement('option');
        option.value = univ;
        option.textContent = univ;
        univEl.appendChild(option);
      });
    }
    filter();
  });

  // Initial render
  renderPage('', '', '');
  btn.addEventListener('click', filter);
  nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') filter(); });
  nameEl.addEventListener('input', () => { if (!nameEl.value && !stateEl.value && !univEl.value) filter(); });
  univEl.addEventListener('change', filter);
}

// Only wire on the counselors page
document.addEventListener('DOMContentLoaded', () => {
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (path === 'counselor.html') wireCounselorSearch();
});
