(function () {
  const form = document.getElementById("login-form");
  const username = document.getElementById("username");
  const password = document.getElementById("password");
  const message = document.getElementById("login-message");
  const button = form.querySelector("button");

  fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" })
    .then(function (response) { return response.json(); })
    .then(function (result) {
      if (result.authenticated) window.location.replace("/admin/app");
    })
    .catch(function () {});

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    message.textContent = "";
    button.disabled = true;
    button.textContent = "Signing in…";
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json", "accept": "application/json" },
        body: JSON.stringify({ username: username.value, password: password.value })
      });
      const result = await response.json();
      if (!response.ok) {
        message.textContent = result.error || "Sign-in failed. Please try again.";
        password.value = "";
        password.focus();
        return;
      }
      password.value = "";
      window.location.replace("/admin/app");
    } catch {
      message.textContent = "Could not connect. Please check your connection and try again.";
    } finally {
      button.disabled = false;
      button.innerHTML = 'Sign in securely <span aria-hidden="true">→</span>';
    }
  });
})();
