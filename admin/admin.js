(function () {
  const auth = document.getElementById("auth-status");
  const db = document.getElementById("db-status");
  const copy = document.getElementById("status-copy");
  const logout = document.getElementById("logout-button");

  fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("not signed in");
      return response.json();
    })
    .then(function (result) {
      if (!result.authenticated) {
        window.location.replace("/admin");
        return;
      }
      auth.textContent = "Signed in";
      return fetch("/api/admin/health", { credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } });
    })
    .then(async function (response) {
      if (!response) return;
      const result = await response.json();
      if (response.status === 401) {
        window.location.replace("/admin");
      } else if (response.ok && result.database === "connected") {
        db.textContent = "Connected";
        copy.textContent = "Your secure session is active and the database connection is working.";
      } else if (result.database === "not_configured") {
        db.textContent = "Setup required";
        copy.textContent = "Login is working. The D1 database still needs to be created and connected.";
      } else {
        db.textContent = "Check required";
        copy.textContent = "Login is working, but the database connection needs attention.";
      }
    })
    .catch(function () {
      window.location.replace("/admin");
    });

  logout.addEventListener("click", async function () {
    logout.disabled = true;
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json", "accept": "application/json" },
        body: "{}"
      });
    } finally {
      window.location.replace("/admin");
    }
  });
})();
