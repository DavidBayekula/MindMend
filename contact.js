// contact.js – with correct Authorization
document.addEventListener("DOMContentLoaded", () => {
  const card       = document.querySelector(".card.contact-form");
  const nameInput  = card.querySelector("input[placeholder='Your name']");
  const emailInput = card.querySelector("input[placeholder='Your email']");
  const subjInput  = card.querySelector("input[placeholder='Subject']");
  const msgInput   = card.querySelector("textarea[placeholder='Type your message…']");
  const sendBtn    = card.querySelector(".btn");

  // Honeypot
  let hp = card.querySelector("input[name='hp']");
  if (!hp) {
    hp = Object.assign(document.createElement("input"), {
      type: "text", name: "hp", tabIndex: -1,
      style: "position:absolute;left:-9999px;"
    });
    card.appendChild(hp);
  }

  const EDGE_URL = `https://pgpxmtkzgifspotnjrpi.supabase.co/functions/v1/contact-to-slack`;

  const validate = () => {
    const n = nameInput.value.trim();
    const e = emailInput.value.trim();
    const m = msgInput.value.trim();
    if (!n || !e || !m) return "Fill name, email, message.";
    if (!/^\S+@\S+\.\S+$/.test(e)) return "Valid email required.";
    if (hp.value) return "Bot.";
    return null;
  };

  sendBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return alert(err);

    sendBtn.disabled = true;
    const prev = sendBtn.textContent;
    sendBtn.textContent = "Sending…";

    const payload = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      subject: subjInput.value.trim() || null,
      message: msgInput.value.trim(),
    };

    try {
      // ENSURE THIS HEADER IS SENT
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      alert("✅Message sent! We'll reply soon.");
      nameInput.value = emailInput.value = subjInput.value = msgInput.value = "";
    } catch (err) {
      console.error("Contact form error:", err);
      alert("❌ Failed. Email Mindmend@outlook.com directly.");
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = prev;
    }
  });
});