// Static counselor dataset
const COUNSELORS = [
  {"name":"Cox, Birshari G","university":"North Carolina Central University","summary":"Experienced in helping students manage stress and overcome challenges","email":"bcox@nccu.edu","phone":"919-530-5286","linkText":"Campus Wellness Center","linkUrl":"https://www.nccu.edu/"},
  {"name":"Johnson, Amina","university":"Duke University","summary":"Focus on mindfulness-based stress reduction and academic resilience","email":"amina.johnson@example.edu","phone":"919-555-0142","linkText":"Counseling & Psychological Services","linkUrl":"https://studentaffairs.duke.edu/caps"},
  {"name":"Martinez, David","university":"University of North Carolina at Chapel Hill","summary":"Supports first-gen students and test anxiety management","email":"d.martinez@example.edu","phone":"919-555-0176","linkText":"UNC CAPS","linkUrl":"https://caps.unc.edu/"},
  {"name":"Nguyen, Thao","university":"North Carolina Central University","summary":"Short-term counseling and referral coordination for NCCU students","email":"thao.nguyen@example.edu","phone":"919-555-0119","linkText":"NCCU Counseling Center","linkUrl":"https://www.nccu.edu/"}
];

function wireCounselorSearch(){
  const nameEl=document.getElementById('counselorName');
  const univEl=document.getElementById('counselorUniv');
  const btn=document.getElementById('searchBtn');
  const out=document.getElementById('counselorResults');
  const label=document.getElementById('resultsFor');
  if(!nameEl||!univEl||!btn||!out) return;

  function render(list,qName,qUniv){
    if(label){
      const has=(qName||qUniv);
      label.style.display=has?'block':'none';
      if(has){
        const parts=[];
        if(qName) parts.push(`name: “${qName}”`);
        if(qUniv) parts.push(`university: “${qUniv}”`);
        label.textContent="Showing results for "+parts.join(" • ");
      }
    }
    out.innerHTML='';
    if(!list.length){
      out.innerHTML=`<p class="muted" style="margin-top:12px">No counselors matched your search.</p>`;
      return;
    }
    list.forEach(c=>{
      const card=document.createElement('div');
      card.className='c-card';
      card.innerHTML=`
        <div class="c-avatar" aria-hidden="true"></div>
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
  }

  function filter(){
    const qName=(nameEl.value||'').trim().toLowerCase();
    const qUniv=(univEl.value||'').trim().toLowerCase();
    const results=COUNSELORS.filter(c=>{
      const nameOk=!qName||c.name.toLowerCase().includes(qName);
      const univOk=!qUniv||c.university.toLowerCase().includes(qUniv);
      return nameOk&&univOk;
    });
    render(results, nameEl.value.trim(), univEl.value.trim());
  }

  render(COUNSELORS,'','');
  btn.addEventListener('click',filter);
  nameEl.addEventListener('keydown',e=>{ if(e.key==='Enter') filter(); });
  univEl.addEventListener('keydown',e=>{ if(e.key==='Enter') filter(); });
  nameEl.addEventListener('input',()=>{ if(!nameEl.value&&!univEl.value) filter(); });
  univEl.addEventListener('input',()=>{ if(!nameEl.value&&!univEl.value) filter(); });
}

// Only wire on the counselors page
document.addEventListener('DOMContentLoaded', () => {
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (path === 'counselor.html') wireCounselorSearch();
});
