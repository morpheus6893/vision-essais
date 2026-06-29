// =============================================================
// Navigation entre les écrans
// =============================================================

// Tous les boutons de navigation
const navButtons = document.querySelectorAll('nav button');
// Tous les écrans
const screens = document.querySelectorAll('.screen');

/**
 * Affiche l'écran demandé et masque les autres
 * @param {string} screenName - nom logique de l'écran (accueil, parcours, competences, admin)
 */
function showScreen(screenName) {
  // Masquer tous les écrans
  screens.forEach(s => s.classList.remove('active'));

  // Afficher l'écran ciblé
  const targetScreen = document.getElementById(`screen-${screenName}`);
  if (targetScreen) {
    targetScreen.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Mettre à jour l'état actif des boutons nav
  navButtons.forEach(b => b.classList.remove('active'));
  const navBtn = document.querySelector(`nav button[data-screen="${screenName}"]`);
  if (navBtn) navBtn.classList.add('active');

  // Si on arrive sur l'écran Admin, on rafraîchit la liste
  if (screenName === 'admin' && typeof refreshAdminList === 'function') {
    refreshAdminList();
  }
}

// Écouteurs sur les boutons de navigation
navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-screen');
    showScreen(target);
  });
});

// =============================================================
// Filtres de la timeline "Mon parcours"
// =============================================================
const filterButtons = document.querySelectorAll('.filter-btn');
const events = document.querySelectorAll('.event');

/**
 * Applique un filtre sur les événements du parcours
 * @param {string} filter - all | formation | terrain | autre
 */
function applyFilter(filter) {
  if (!filterButtons.length || !events.length) return;

  // Mise à jour des boutons actifs
  filterButtons.forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-filter') === filter);
  });

  // Affichage des événements filtrés
  events.forEach(ev => {
    if (filter === 'all') {
      ev.style.display = 'block';
    } else {
      ev.style.display = ev.classList.contains(`event-${filter}`) ? 'block' : 'none';
    }
  });
}

// Écouteurs sur les boutons de filtre
filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    applyFilter(btn.getAttribute('data-filter'));
  });
});

// =============================================================
// Actions rapides de l'écran d'accueil
// =============================================================
const btnGoParcours = document.getElementById('btn-go-parcours');
const btnGoParcoursFormation = document.getElementById('btn-go-parcours-formation');

if (btnGoParcours) {
  btnGoParcours.addEventListener('click', () => {
    showScreen('parcours');
    applyFilter('all');
  });
}

if (btnGoParcoursFormation) {
  btnGoParcoursFormation.addEventListener('click', () => {
    showScreen('parcours');
    applyFilter('formation');
  });
}
