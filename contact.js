// contact.js (frontend)
document.addEventListener("DOMContentLoaded", () => {
  const card      = document.querySelector(".card.contact-form");
  const nameInput = card.querySelector("input[placeholder='Your name']");
  const emailInput= card.querySelector("input[placeholder='Your email']");
  const subjInput = card.querySelector("input[placeholder='Subject']");
  const msgInput  = card.querySelector("textarea[placeholder='Type your message…']");
  const sendBtn   = card.querySelector(".btn");

  // Optional honeypot
  let honeypot = card.querySelector("input[name='website']");
  if (!honeypot) {
    honeypot = document.createElement("input");
    honeypot.type = "text";
    honeypot.name = "website";
    honeypot.style.display = "none";
    card.appendChild(honeypot);
  }

  const EDGE_URL = "https://<your-project-ref>.functions.supabase.co/contact-to-slack";

  function validate() {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = msgInput.value.trim();
    if (!name || !email || !message) return "Please fill in name, email, and message.";
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Please enter a valid email address.";
    if (honeypot.value) return "Bot detected.";
    return null;
  }

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
      subject: subjInput.value.trim(),
      message: msgInput.value.trim(),
    };

    try {
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // If you enable function auth, include your anon key:
          // "Authorization": "Bearer " + window.SUPABASE_ANON_KEY
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || "Request failed");

      alert("Message received! We’ll reach out soon.");
      nameInput.value = "";
      emailInput.value = "";
      subjInput.value = "";
      msgInput.value = "";
    } catch (e) {
      console.error(e);
      alert("We couldn’t send your message. Please try again later.");
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = prev;
    }
  });
});
