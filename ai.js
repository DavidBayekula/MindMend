// ai.js — MindMend AI with history + delete chat option

(function () {
  let state = {
    messages: [],
    chats: [] // list of past chats
  };

  const isLocal =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";

  const CHAT_URL = isLocal
    ? "http://localhost:54321/functions/v1/chat"
    : "https://pgpxmtkzgifspotnjrpi.functions.supabase.co/chat";

  // -------------------
  // UI Helpers
  // -------------------
  function appendLog(html) {
    const log = document.getElementById("aiLog");
    const div = document.createElement("div");
    div.innerHTML = html;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  function clearLog() {
    const log = document.getElementById("aiLog");
    if (log) log.innerHTML = "";
  }

  function setSending(sending) {
    const btn = document.getElementById("aiSend");
    const input = document.getElementById("aiInput");
    if (!btn || !input) return;
    btn.disabled = !!sending;
    input.disabled = !!sending;
  }

  function localFallback(userMessage) {
    const genericResponses = [
      "It sounds like you’re going through a lot. Try writing down what feels most important right now.",
      "Remember you’re not alone—many students feel overwhelmed. Maybe take a short walk or breathe deeply.",
      "Reaching out to a trusted friend, mentor, or counselor can help. You’re already taking a good step by reflecting here.",
    ];
    const pick = genericResponses[Math.floor(Math.random() * genericResponses.length)];
    return `Here’s a thought based on your message (“${userMessage}”): ${pick}`;
  }

  // -------------------
  // Supabase call
  // -------------------
  async function callChat(message, allowJournal) {
    const payload = {
      messages: [...state.messages, { role: "user", content: message }],
      use_journals: !!allowJournal
    };

    const { data: { session } } = await window.supabase.auth.getSession();

    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.message || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return json?.content || "";
  }

  // -------------------
  // Send + Log
  // -------------------
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

      state.messages.push({ role: "user", content: text });
      state.messages.push({ role: "assistant", content: reply });

      document.getElementById(typingId)?.remove();
      appendLog(`<p><strong>MindMend AI:</strong> ${reply}</p>`);
      input.value = "";
      saveState();
    } catch (err) {
      document.getElementById(typingId)?.remove();
      const fallback = localFallback(text);
      appendLog(`<p class="muted">[AI unavailable: ${err.message}]</p>`);
      appendLog(`<p><strong>MindMend AI (fallback):</strong> ${fallback}</p>`);
      state.messages.push({ role: "user", content: text });
      state.messages.push({ role: "assistant", content: fallback });
      saveState();
    } finally {
      setSending(false);
    }
  }

  // -------------------
  // New Chat + History
  // -------------------
  function onNewChat() {
    if (state.messages.length > 0) {
      // Save current chat
      state.chats.push([...state.messages]);
    }
    state.messages = [];
    clearLog();
    appendLog(`<p class="muted">Started a new chat. Previous conversations are in history.</p>`);
    saveState();
    renderChatHistory();
  }

  function renderChatHistory() {
    const sidebar = document.getElementById("chatHistory");
    if (!sidebar) return;

    // Remove only summaries, not the New Chat button
    const summaries = sidebar.querySelectorAll(".chat-summary");
    summaries.forEach(s => s.remove());

    state.chats.forEach((chat, idx) => {
      const div = document.createElement("div");
      div.className = "chat-summary";

      const preview = chat.find(m => m.role === "user")?.content.slice(0, 30) || "(empty chat)";

      // clickable chat title
      const span = document.createElement("span");
      span.textContent = `Chat ${idx + 1}: ${preview}...`;
      span.style.cursor = "pointer";
      span.addEventListener("click", () => loadChat(idx));

      // delete button
      const del = document.createElement("button");
      del.textContent = "🗑️";
      del.style.marginLeft = "8px";
      del.style.cursor = "pointer";
      del.style.border = "none";
      del.style.background = "transparent";
      del.addEventListener("click", (e) => {
        e.stopPropagation(); // don’t trigger load
        deleteChat(idx);
      });

      div.appendChild(span);
      div.appendChild(del);
      sidebar.appendChild(div);
    });
  }

  function loadChat(index) {
    clearLog();
    state.messages = [...state.chats[index]];
    state.messages.forEach(msg => {
      if (msg.role === "user") appendLog(`<p><strong>You:</strong> ${msg.content}</p>`);
      else appendLog(`<p><strong>MindMend AI:</strong> ${msg.content}</p>`);
    });
  }

  function deleteChat(index) {
    state.chats.splice(index, 1);
    saveState();
    renderChatHistory();
  }

  // -------------------
  // Persistence (localStorage)
  // -------------------
  function saveState() {
    localStorage.setItem("mindmend_ai_state", JSON.stringify(state));
  }

  function loadState() {
    const raw = localStorage.getItem("mindmend_ai_state");
    if (raw) {
      try {
        state = JSON.parse(raw);
      } catch {
        state = { messages: [], chats: [] };
      }
    }
  }

  // -------------------
  // Init
  // -------------------
  function boot() {
    const btn = document.getElementById("aiSend");
    const input = document.getElementById("aiInput");
    const newBtn = document.getElementById("newChat");

    btn?.addEventListener("click", onSend);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") onSend();
    });
    newBtn?.addEventListener("click", onNewChat);

    renderChatHistory();

    // Restore last open chat
    if (state.messages.length > 0) {
      clearLog();
      state.messages.forEach(msg => {
        if (msg.role === "user") appendLog(`<p><strong>You:</strong> ${msg.content}</p>`);
        else appendLog(`<p><strong>MindMend AI:</strong> ${msg.content}</p>`);
      });
    }
  }

  loadState();
  document.addEventListener("DOMContentLoaded", boot);
  document.addEventListener("core:ready", boot); // keep if core.js dispatches it
})();
