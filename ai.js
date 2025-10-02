// ai.js — MindMend AI chat page logic (Option A: direct functions domain)

(function () {
  const state = {
    messages: [] // optional: keep a tiny chat history for context
  };

  // Pick the right Edge Function URL (local vs deployed)
  const isLocal =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";

  const CHAT_URL = isLocal
    ? "http://localhost:54321/functions/v1/chat" // when running: npx supabase functions serve chat
    : "https://pgpxmtkzgifspotnjrpi.functions.supabase.co/chat"; // deployed function

  function appendLog(html) {
    const log = document.getElementById("aiLog");
    const div = document.createElement("div");
    div.innerHTML = html;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  function setSending(sending) {
    const btn = document.getElementById("aiSend");
    const input = document.getElementById("aiInput");
    if (!btn || !input) return;
    btn.disabled = !!sending;
    input.disabled = !!sending;
  }

  async function callChat(message, allowJournal) {
    const payload = {
      messages: [
        ...state.messages,
        { role: "user", content: message }
      ],
      use_journals: !!allowJournal
    };

    // Get a user token (required in production)
    const { data: { session } } = await window.supabase.auth.getSession();

    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Token is required in production (your Edge Function checks auth)
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error || `Request failed (${res.status})`);
    }
    return json?.content || "";
  }

  async function onSend() {
    const input = document.getElementById("aiInput");
    const consent = document.getElementById("aiConsent");
    const text = (input?.value || "").trim();
    if (!text) return;

    appendLog(`<p><strong>You:</strong> ${text}</p>`);

    const typingId = `typing-${Date.now()}`;
    appendLog(`<p id="${typingId}" class="muted">MindMend AI is thinking…</p>`);

    setSending(true);
    try {
      const reply = await callChat(text, consent?.checked !== false);

      // keep a tiny rolling history (optional)
      state.messages.push({ role: "user", content: text });
      state.messages.push({ role: "assistant", content: reply });

      document.getElementById(typingId)?.remove();
      appendLog(`<p><strong>MindMend AI:</strong> ${reply}</p>`);
      input.value = "";
    } catch (err) {
      document.getElementById(typingId)?.remove();
      appendLog(`<p class="muted">Error: ${err.message || err}</p>`);
    } finally {
      setSending(false);
    }
  }

  function boot() {
    const btn = document.getElementById("aiSend");
    const input = document.getElementById("aiInput");

    btn?.addEventListener("click", onSend);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") onSend();
    });
  }

  // Start only after core auth/guard is ready
  if (window.core?.onReady) {
    window.core.onReady(boot);
  } else {
    document.addEventListener("core:ready", boot);
  }
})();
