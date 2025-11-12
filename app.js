// app.js — journal only

// Utility: preview text without HTML
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return (tmp.textContent || tmp.innerText || '').trim();
}

// ----- Supabase CRUD (journal) -----
async function journalList() {
  const { data: { session } } = await window.supabase.auth.getSession();
  if (!session) return [];
  const { data, error } = await window.supabase
    .from('journal_entries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function journalDuplicateExists(title, body) {
  const { data, error } = await window.supabase
    .from('journal_entries')
    .select('id')
    .eq('title', title || null)
    .eq('body',  body  || null)
    .limit(1);
  if (error) throw error;
  return (data && data.length > 0);
}

async function journalCreate(payload) {
  if (await journalDuplicateExists(payload.title || null, payload.body || null)) {
    throw new Error('This exact journal (title + body) already exists.');
  }
  const { data, error } = await window.supabase
    .from('journal_entries')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function journalUpdate(id, payload) {
  const { data, error } = await window.supabase
    .from('journal_entries')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function journalDelete(id) {
  const { error } = await window.supabase
    .from('journal_entries')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

// ----- Journal UI -----
function wireJournal() {
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (path !== 'journal.html') return;

  // DOM
  const jList   = document.getElementById('jList');
  const jTitle  = document.getElementById('jTitle');
  const jBodyEl = document.getElementById('jBody'); // textarea
  const jSave   = document.getElementById('jSave');
  const jMsg    = document.getElementById('jMsg');
  const jNew    = document.getElementById('jNew');
  const jActions= document.getElementById('jActions');
  const jId     = document.getElementById('jId');
  const jEdit   = document.getElementById('jEdit');
  const jUpdate = document.getElementById('jUpdate');
  const jCancel = document.getElementById('jCancel');
  const jDelete = document.getElementById('jDelete');
  const feelingsPicker = document.querySelector('.feelings-picker');
  let selectedFeeling = null;               // current emoji (or null)

// Helper: set UI + internal state
function setFeeling(emoji) {
  selectedFeeling = emoji;
  feelingsPicker.querySelectorAll('.feeling-chip').forEach(b => {
    b.classList.toggle('selected', b.dataset.emoji === emoji);
  });
}

  // TinyMCE init (promise so we can await it)
  let tinyReady = null;
  if (window.tinymce && jBodyEl) {
    tinyReady = window.tinymce.init({
      selector: '#jBody',
      height: 320,
      menubar: 'edit view insert format tools table',
      toolbar: 'fontsizeselect formatselect | bold italic underline | forecolor backcolor | link | superscript subscript | removeformat',
      plugins: 'wordcount link lists table',
      branding: false,
      statusbar: true,
      toolbar_mode: 'sliding',
      content_style: 'body{font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.6;}'
    });
  }

  feelingsPicker?.addEventListener('click', e => {
  const chip = e.target.closest('.feeling-chip');
  if (!chip) return;
  const emoji = chip.dataset.emoji ?? null;   // clear button has no data-emoji
  setFeeling(emoji);
});

  // Local state
  let current = null;   // selected entry
  let mode = 'compose'; // 'compose' | 'view' | 'edit'

  // Editor helpers
  const getBody = () => window.tinymce?.get('jBody')?.getContent() ?? (jBodyEl?.value || '');
  const setBody = (html) => {
    if (window.tinymce?.get('jBody')) window.tinymce.get('jBody').setContent(html || '');
    if (jBodyEl) jBodyEl.value = html || '';
  };
  function setBodyDisabled(disabled) {
    const ed = window.tinymce?.get('jBody');
    if (ed?.mode?.set) ed.mode.set(disabled ? 'readonly' : 'design'); // TinyMCE v6
    const ta = document.getElementById('jBody');
    if (ta) ta.readOnly = !!disabled; // fallback
  }

  // UI helpers
  function datePill(dtStr, feeling = '') {
  const d = new Date(dtStr);
  const day = String(d.getDate()).padStart(2,'0');
  const mon = d.toLocaleString(undefined, { month: 'short' }).toUpperCase();
  return `<div class="datepill"><div>${day}</div><small>${mon}</small></div>${feeling ? `<span style="margin-left:6px;font-size:1.4rem">${feeling}</span>` : ''}`;
}

  function setMode(next){
    mode = next;
    if (mode === 'compose') {
      current = null;
      if (jId) jId.value = '';
      if (jTitle) jTitle.disabled = false;
      setBodyDisabled(false);
      if (jSave)  jSave.style.display = '';
      if (jActions) jActions.style.display = 'none';
      if (jUpdate)  jUpdate.style.display  = 'none';
      if (jCancel)  jCancel.style.display  = 'none';
      if (jEdit)    jEdit.style.display    = '';
      if (jDelete)  jDelete.style.display  = '';
    } else if (mode === 'view') {
      if (jTitle) jTitle.disabled = true;
      setBodyDisabled(true);
      if (jSave)  jSave.style.display = 'none';
      if (jActions) jActions.style.display = '';
      if (jEdit)    jEdit.style.display    = '';
      if (jDelete)  jDelete.style.display  = '';
      if (jUpdate)  jUpdate.style.display  = 'none';
      if (jCancel)  jCancel.style.display  = 'none';
    } else if (mode === 'edit') {
      if (jTitle) jTitle.disabled = false;
      setBodyDisabled(false);
      if (jSave)  jSave.style.display = 'none';
      if (jActions) jActions.style.display = '';
      if (jEdit)    jEdit.style.display    = 'none';
      if (jDelete)  jDelete.style.display  = 'none';
      if (jUpdate)  jUpdate.style.display  = '';
      if (jCancel)  jCancel.style.display  = '';
    }
  }

  function renderList(items){
    // Keep + New Entry on top
    const newBtn = document.getElementById('jNew');
    jList.innerHTML = '';
    if (newBtn) jList.appendChild(newBtn);

    if (!items || !items.length){
      const p = document.createElement('p');
      p.className = 'muted';
      p.style = 'padding:8px 6px';
      p.textContent = 'No entries yet. Write something and click Save.';
      jList.appendChild(p);
      return;
    }
    items.forEach(e=>{
      const preview = stripHtml(e.body).slice(0,80);
      const div = document.createElement('div');
      div.className = 'entry';
      div.setAttribute('role','button');
      div.setAttribute('tabindex','0');
      div.innerHTML = `${datePill(e.created_at, e.feeling)}
        <div><strong>${e.title || '(Untitled)'}</strong>
        <p class="muted" style="margin:6px 0 0">${preview}${preview.length===80?'…':''}</p></div>`;
      div.addEventListener('click', ()=>{
        current = e;
        if (jId)     jId.value    = e.id;
        if (jTitle)  jTitle.value = e.title || '';
        setBody(e.body || '');
        setFeeling(e.feeling ?? null);
        setMode('view');
      });
      div.addEventListener('keydown', (ev)=>{ if (ev.key === 'Enter' || ev.key === ' ') div.click(); });
      jList.appendChild(div);
    });
  }

  async function load(){
    try {
      if (tinyReady) await tinyReady; // ensure editor is ready
      const items = await journalList();
      renderList(items);
    } catch(err){
      jMsg.textContent = err.message || 'Failed to load';
    }
  }

  // Actions
  jNew?.addEventListener('click', ()=>{
    current = null;
    if (jId)    jId.value = '';
    if (jTitle) jTitle.value = '';
    setBody('');
    setMode('compose');
    setFeeling(null);
  });

  jSave?.addEventListener('click', async ()=>{
    const title = (jTitle?.value || '').trim();
    const body  = (getBody() || '').trim(); // HTML content
    if (!title && !stripHtml(body)){
      jMsg.textContent = 'Nothing to save. Add a title or write something.';
      return;
    }
    try {
      await journalCreate({ title, body, feeling: selectedFeeling });
      if (jTitle) jTitle.value = '';
      setBody('');
      jMsg.textContent = 'Saved.';
      setMode('compose');
      await load();
      setTimeout(()=> jMsg.textContent = '', 1200);
    } catch(err) {
      jMsg.textContent = err.message || 'Save failed';
    }
  });

  jEdit?.addEventListener('click', ()=>{
    if (!current) return;
    setMode('edit');
  });

  jCancel?.addEventListener('click', ()=>{
    if (!current) { setMode('compose'); return; }
    if (jTitle) jTitle.value = current.title || '';
    setBody(current.body || '');
    setMode('view');
    setFeeling(current?.feeling ?? null);
  });

  jUpdate?.addEventListener('click', async ()=>{
    if (!current) return;
    const id    = jId?.value;
    const title = (jTitle?.value || '').trim();
    const body  = (getBody() || '').trim();
    if (!title && !stripHtml(body)){
      jMsg.textContent = 'Nothing to update. Add a title or write something.';
      return;
    }
    try {
      const updated = await journalUpdate(id, { title, body, feeling: selectedFeeling });
      current = updated;
      jMsg.textContent = 'Updated.';
      setMode('view');
      await load();
      setTimeout(()=> jMsg.textContent = '', 1200);
    } catch(err) {
      jMsg.textContent = err.message || 'Update failed';
    }
  });

  jDelete?.addEventListener('click', async ()=>{
    if (!current) return;
    if (!confirm('Delete this journal entry?')) return;
    try {
      await journalDelete(current.id);
      current = null;
      if (jId)    jId.value = '';
      if (jTitle) jTitle.value = '';
      setBody('');
      jMsg.textContent = 'Deleted.';
      setMode('compose');
      await load();
      setTimeout(()=> jMsg.textContent = '', 1200);
    } catch(err) {
      jMsg.textContent = err.message || 'Delete failed';
    }
  });

  // Start in compose mode
  setMode('compose');
  load();
}

// Start journal after core says it's safe
if (window.core && typeof window.core.onReady === 'function') {
  window.core.onReady(() => wireJournal());
} else {
  // Fallback if core.js loads after this file
  document.addEventListener('core:ready', () => wireJournal());
}
