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
      break;
  }
}

export function initNavigation() {
  const buttons = document.querySelectorAll("[data-screen]");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const screen = btn.dataset.screen;
      loadScreen(screen);
      setActiveButton(screen);
    });
  });

  loadScreen("accueil");
  setActiveButton("accueil");
}

function setActiveButton(screen) {
  const buttons = document.querySelectorAll("[data-screen]");
  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.screen === screen);
  });
}
