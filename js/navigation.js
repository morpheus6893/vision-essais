// =============================================================
// Chargement dynamique des écrans
// =============================================================

export async function loadScreen(name) {
  const container = document.getElementById("screen-container");

  try {
    const response = await fetch(`screens/${name}.html`);
    if (!response.ok) {
      container.innerHTML = `<p style="color:red;">Erreur : écran "${name}" introuvable (${response.status}).</p>`;
      return;
    }

    const html = await response.text();
    container.innerHTML = html;

    runScreenScript(name);

  } catch (err) {
    container.innerHTML = `<p style="color:red;">Impossible de charger l'écran "${name}".</p>`;
    console.error("Erreur de chargement :", err);
  }
}

// =============================================================
// Scripts spécifiques aux écrans
// =============================================================

function runScreenScript(name) {
  switch (name) {

    case "accueil":
      // Chargement dynamique du profil agent
      if (typeof loadAccueil === "function") loadAccueil();
      break;

    case "parcours":
      if (typeof initParcours === "function") initParcours();
      break;

    case "sami":
      if (typeof initSami === "function") initSami();
      break;

    case "admin":
      if (typeof initAdmin === "function") initAdmin();
      break;

    case "login":
      if (typeof initLogin === "function") initLogin();

      // 🔥 CORRECTION CRITIQUE : attacher le bouton de connexion ici
      const loginBtn = document.getElementById("login-btn");
      if (loginBtn && typeof loginAdmin === "function") {
        loginBtn.addEventListener("click", loginAdmin);
      }
      break;

    default:
      break;
  }
}

// =============================================================
// Navigation principale
// =============================================================

export function initNavigation() {
  const buttons = document.querySelectorAll("[data-screen]");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const screen = btn.dataset.screen;

      // Cas particulier : ADMIN → protégé par Firebase
      if (screen === "admin") {
        console.log("Accès admin demandé → Firebase gère l'autorisation");
        return;
      }

      // Cas particulier : LOGIN → toujours accessible
      if (screen === "login") {
        loadScreen("login");
        setActiveButton("login");
        return;
      }

      // Navigation classique
      loadScreen(screen);
      setActiveButton(screen);
    });
  });

  // Écran par défaut
  loadScreen("accueil");
  setActiveButton("accueil");
}

// =============================================================
// Mise en surbrillance du bouton actif
// =============================================================

function setActiveButton(screen) {
  const buttons = document.querySelectorAll("[data-screen]");
  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.screen === screen);
  });
}
