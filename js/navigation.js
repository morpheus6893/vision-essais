// =============================================================
// Chargement dynamique des écrans
// =============================================================

/**
 * Charge un écran HTML depuis /screens/<name>.html
 * et l'injecte dans #screen-container
 * @param {string} name - nom de l'écran (accueil, parcours, sami, etc.)
 */
export async function loadScreen(name) {
  const container = document.getElementById("screen-container");

  try {
    const response = await fetch(`screens/${name}.html`);
    if (!response.ok) {
      container.innerHTML = `<p style="color:red;">Erreur : écran "${name}" introuvable.</p>`;
      return;
    }

    const html = await response.text();
    container.innerHTML = html;

    // Exécuter un script spécifique à l'écran si nécessaire
    runScreenScript(name);

  } catch (err) {
    container.innerHTML = `<p style="color:red;">Impossible de charger l'écran "${name}".</p>`;
    console.error(err);
  }
}

// =============================================================
// Scripts spécifiques à certains écrans
// =============================================================

function runScreenScript(name) {
  switch (name) {
    case "parcours":
      if (typeof initParcours === "function") initParcours();
      break;

    case "sami":
      if (typeof initSami === "function") initSami();
      break;

    case "admin":
      if (typeof initAdmin === "function") initAdmin();
      break;

    default:
      // Aucun script spécifique
      break;
  }
}

// =============================================================
// Gestion des boutons de navigation
// =============================================================

export function initNavigation() {
  const buttons = document.querySelectorAll("[data-screen]");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const screen = btn.dataset.screen;
      loadScreen(screen);
      setActiveButton(screen);
    });
  });

  // Charger l'écran d'accueil au démarrage
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
