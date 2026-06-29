// @ts-nocheck
// =============================================================
// Module de gestion du stockage local (localStorage)
// =============================================================

/**
 * Vérifie si le localStorage est disponible
 * @returns {boolean}
 */
function localStorageAvailable() {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.warn('localStorage non disponible :', e);
    return false;
  }
}

/**
 * Charge un objet JSON depuis le localStorage
 * @param {string} key - clé de stockage
 * @param {any} [defaultValue] - valeur par défaut si rien n'est trouvé
 * @returns {any}
 */
function loadJSON(key, defaultValue = null) {
  if (!localStorageAvailable()) return defaultValue;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Erreur de lecture JSON pour "${key}" :`, e);
    return defaultValue;
  }
}

/**
 * Sauvegarde un objet JSON dans le localStorage
 * @param {string} key - clé de stockage
 * @param {any} value - valeur à sauvegarder
 * @returns {void}
 */
function saveJSON(key, value) {
  if (!localStorageAvailable()) return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Erreur de sauvegarde JSON pour "${key}" :`, e);
  }
}
