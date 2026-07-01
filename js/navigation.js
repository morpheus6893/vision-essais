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
      // Le chargement des données Firebase se fait maintenant via tryLoadAccueil() dans app.js
      console.log("Écran Accueil injecté.");
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

      // Si l'utilisateur clique sur Admin, on l'envoie vers l'écran de login
      if (screen === "admin") {
        console.log("Accès admin demandé -> Redirection login");
        loadScreen("login");
        setActiveButton("admin");
        return;
      }

      // Navigation classique pour le reste
      loadScreen(screen);
      setActiveButton(screen);
    });
  });

  // On active visuellement le bouton accueil au démarrage
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
