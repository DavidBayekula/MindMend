// contact.js – direct to Slack (no backend)
document.addEventListener("DOMContentLoaded", () => {
  const formCard   = document.querySelector(".card.contact-form");
  const nameInput  = formCard.querySelector("input[placeholder='Your name']");
  const emailInput = formCard.querySelector("input[placeholder='Your email']");
  const subjInput  = formCard.querySelector("input[placeholder='Subject']");
  const msgInput   = formCard.querySelector("textarea[placeholder='Type your message…']");
  const sendBtn    = formCard.querySelector(".btn");

  // ---- Honeypot (spam protection) ----
  let honeypot = formCard.querySelector("input[name='website']");
  if (!honeypot) {
    honeypot = document.createElement("input");
    honeypot.type = "text";
    honeypot.name = "website";
    honeypot.tabIndex = -1;
    honeypot.autocomplete = "off";
    honeypot.style.position = "absolute";
    honeypot.style.left = "-9999px";
    formCard.appendChild(honeypot);
  }

  // ---- YOUR SLACK WEBHOOK (DELETE AFTER PROJECT) ----
  const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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";

  // ---- Validation ----
  const validate = () => {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = msgInput.value.trim();

    if (!name || !email || !message) return "Fill in name, email, and message.";
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Valid email required.";
    if (honeypot.value) return "Bot detected.";
    return null;
  };

  // ---- Submit handler ----
  sendBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return alert(err);

    sendBtn.disabled = true;
    const oldText = sendBtn.textContent;
    sendBtn.textContent = "Sending…";

    const payload = {
      text: "*New Contact Form Submission*",
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: "*New message via MindMend*" } },
        { type: "divider" },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Name:*\n${nameInput.value.trim()}` },
            { type: "mrkdwn", text: `*Email:*\n${emailInput.value.trim()}` },
            { type: "mrkdwn", text: `*Subject:*\n${subjInput.value.trim() || "—"}` },
          ],
        },
        { type: "section", text: { type: "mrkdwn", text: `*Message:*\n${msgInput.value.trim()}` } },
        { type: "context", elements: [{ type: "mrkdwn", text: `_${new Date().toLocaleString()}_` }] },
      ],
    };

    try {
      const res = await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Slack rejected the request");

      alert("Message sent! We'll get back to you soon.");
      nameInput.value = emailInput.value = subjInput.value = msgInput.value = "";
    } catch (err) {
      console.error(err);
      alert("Failed to send. Try emailing Mindmend@outlook.com directly.");
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = oldText;
    }
  });
});