// account.js – email & password update (Supabase Auth)
document.addEventListener("DOMContentLoaded", async () => {
  // ------------------------------------------------------------------
  // 1. Wait for core to be ready + fetch current user
  // ------------------------------------------------------------------
  await new Promise(resolve => window.core.onReady(resolve));
  const user = (await window.supabase.auth.getUser()).data.user;
  if (!user) { location.replace("login.html"); return; }

  const emailInput        = document.getElementById("email");
  const newPassInput      = document.getElementById("newPassword");
  const confirmPassInput  = document.getElementById("confirmPassword");
  const form              = document.getElementById("accountForm");
  const msg               = document.getElementById("msg");

  // Pre-fill current email
  emailInput.value = user.email ?? "";

  // ------------------------------------------------------------------
  // 2. Helper: show temporary message
  // ------------------------------------------------------------------
  const showMsg = (text, isError = false) => {
    msg.textContent = text;
    msg.style.color = isError ? "#c33" : "#2e6";
    setTimeout(() => msg.textContent = "", 5000);
  };

  // ------------------------------------------------------------------
  // 3. Form validation
  // ------------------------------------------------------------------
  const validate = () => {
    const email = emailInput.value.trim();
    const newPass = newPassInput.value;
    const confirm = confirmPassInput.value;

    if (!email) return "Email is required.";
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Enter a valid email address.";

    if (newPass || confirm) {
      if (newPass.length < 6) return "Password must be at least 6 characters.";
      if (newPass !== confirm) return "Passwords do not match.";
    }
    return null;
  };

  // ------------------------------------------------------------------
  // 4. Submit handler
  // ------------------------------------------------------------------
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const err = validate();
    if (err) return showMsg(err, true);

    const updates = {};

    // Email change
    if (emailInput.value.trim() !== user.email) {
      updates.email = emailInput.value.trim();
    }

    // Password change (only if user typed something)
    const newPass = newPassInput.value;
    if (newPass) updates.password = newPass;

    // Nothing to update?
    if (Object.keys(updates).length === 0) {
      showMsg("No changes detected.");
      return;
    }

    // Disable UI
    const submitBtn = form.querySelector("button[type=submit]");
    const prev = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";

    try {
      const { data, error } = await window.supabase.auth.updateUser(updates);
      if (error) throw error;

      // If email changed, Supabase sends a confirmation link
      if (updates.email) {
        showMsg("✅ Email updated – check your inbox to confirm the new address.");
      } else {
        showMsg("✅ Changes saved successfully.");
      }

      // Clear password fields
      newPassInput.value = confirmPassInput.value = "";
    } catch (err) {
      console.error("Account update error:", err);
      // Special case: password change requires recent login
      if (err.message.includes("reauthenticate")) {
        showMsg("⚠️ For security, please log in again before changing your password.", true);
      } else {
        showMsg(`❌ ${err.message || "Update failed"}`, true);
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = prev;
    }
  });
});