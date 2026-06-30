export function initNavigation() {
  const buttons = document.querySelectorAll("[data-screen]");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const screen = btn.dataset.screen;

      if (screen === "admin") {
        console.log("Accès admin demandé → Firebase gère l'autorisation");
        return;
      }

      if (screen === "login") {
        loadScreen("login");
        setActiveButton("login");
        return;
      }

      loadScreen(screen);
      setActiveButton(screen);
    });
  });

  // ❌ On ne charge plus automatiquement l’accueil ici
  // ✔ On laisse app.js gérer le premier chargement
  setActiveButton("accueil");
}
