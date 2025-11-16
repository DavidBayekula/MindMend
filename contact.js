// contact.js (frontend) – sends to Supabase Edge Function → Slack
document.addEventListener("DOMContentLoaded", () => {
  const card       = document.querySelector(".card.contact-form");
  const nameInput  = card.querySelector("input[placeholder='Your name']");
  const emailInput = card.querySelector("input[placeholder='Your email']");
  const subjInput  = card.querySelector("input[placeholder='Subject']");
  const msgInput   = card.querySelector("textarea[placeholder='Type your message…']");
  const sendBtn    = card.querySelector(".btn");

  // Honeypot field
  let honeypot = card.querySelector("input[name='website']");
  if (!honeypot) {
    honeypot = document.createElement("input");
    honeypot.type = "text";
    honeypot.name = "website";
    honeypot.tabIndex = -1;
    honeypot.style.position = "absolute";
    honeypot.style.left = "-9999px";
    card.appendChild(honeypot);
  }

  // Use your actual project ref
  const EDGE_URL = `https://pgpxmtkzgifspotnjrpi.supabase.co/functions/v1/contact-to-slack`;

  function validate() {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = msgInput.value.trim();

    if (!name || !email || !message) {
      return "Please fill in name, email, and message.";
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return "Please enter a valid email address.";
    }
    if (honeypot.value) {
      return "Bot detected.";
    }
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
      subject: subjInput.value.trim() || "No subject",
      message: msgInput.value.trim(),
    };

    try {
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Optional: Add auth if you secure the function
          //"Authorization": `Bearer ${window.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to send message");
      }

      alert("✅ Message sent! We'll get back to you soon.");
      nameInput.value = emailInput.value = subjInput.value = msgInput.value = "";
    } catch (e) {
      console.error("Contact form error:", e);
      alert("❌ Failed to send. Please try again or email Mindmend@outlook.com directly.");
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = prev;
    }
  });
});