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
      console.log("Écran Accueil injecté -> Récupération des données de l'agent...");
      // Rechargement des données dynamiques pour éviter le retour au modèle par défaut
      import("./app.js?v=2")
        .then(module => {
          if (typeof module.loadAccueil === "function") {
            module.loadAccueil();
          }
        })
        .catch(err => console.error("Erreur lors de la récupération de loadAccueil :", err));
      break;

    case "parcours":
      console.log("Écran Parcours injecté -> Activation des filtres");
      initParcoursFilters();
      break;

    case "sami":
      if (typeof initSami === "function") initSami();
      break;

    case "admin":
      if (typeof initAdmin === "function") initAdmin();
      break;

    case "login":
      console.log("Écran Login injecté -> Liaison du formulaire de connexion");
      
      const loginForm = document.getElementById("login-form");
      if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
          // Empêche le rechargement sauvage de la page par le navigateur
          event.preventDefault(); 
          
          console.log("Formulaire soumis -> Appel Firebase Auth");
          const { loginAdmin } = await import("./app.js?v=2");
          loginAdmin();
        });
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
      
      // L'authentification globale gère déjà la sécurité, on charge l'écran demandé directement
      loadScreen(screen);
      setActiveButton(screen);
    });
  });
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

// =============================================================
// Fonction de filtrage pour l'écran Parcours
// =============================================================
function initParcoursFilters() {
  const filters = document.querySelectorAll(".btn-filter");
  const items = document.querySelectorAll(".timeline-item");

  filters.forEach(button => {
    button.addEventListener("click", () => {
      filters.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      const filterValue = button.dataset.filter;

      items.forEach(item => {
        if (filterValue === "all") {
          item.style.display = "block";
        } else {
          if (item.classList.contains(`filter-${filterValue}`)) {
            item.style.display = "block";
          } else {
            item.style.display = "none";
          }
        }
      });
    });
  });
}
