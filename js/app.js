// =============================================================
// Firebase – Imports
// =============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import { 
  getAuth, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =============================================================
// PDF.js – Import
// =============================================================
import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs";

// =============================================================
// Firebase – Configuration
// =============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDejEzfctjZTiv1gLh25gRjKlUryTgEUdM",
  authDomain: "livret-essais.firebaseapp.com",
  projectId: "livret-essais",
  storageBucket: "livret-essais.firebasestorage.app",
  messagingSenderId: "541452723941",
  appId: "1:541452723941:web:8e5e1c5c3df54d8a2f160c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =============================================================
// Navigation
// =============================================================
import { initNavigation, loadScreen } from "./navigation.js?v=2";

// =============================================================
// Initialisation globale & Sécurisation des routes
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("Vision Essais – Application initialisée");

  // Initialise les écouteurs de clics sur le menu de base
  initNavigation();
  initPdfImport();

  // 🔒 LE GARDIEN : Surveillance en temps réel de l'état de connexion
  onAuthStateChanged(auth, async (user) => {
    const navBar = document.querySelector(".main-nav");

    if (user) {
      console.log("Utilisateur connecté :", user.email);
      
      // 1. Affiche la barre de navigation complète
      if (navBar) navBar.classList.remove("hidden");

      // 2. Charge l'écran d'accueil par défaut
      await loadScreen("accueil");

      // 3. Récupère les données de l'agent actif sur Firestore
      tryLoadAccueil();
    } else {
      console.log("Aucun utilisateur connecté -> Redirection forcée");
      
      // 1. Masque la barre de navigation pour empêcher de tricher en cliquant
      if (navBar) navBar.classList.add("hidden");

      // 2. Force l'affichage de l'écran de login
      loadScreen("login");
    }
  });

  // 🔁 Relance automatique si le DOM de l'accueil prend du temps à s'injecter
  function tryLoadAccueil(retry = 0) {
    const nomEl = document.getElementById("agent-nom");
    if (nomEl) {
      loadAccueil();
    } else if (retry < 5) {
      setTimeout(() => tryLoadAccueil(retry + 1), 500);
    }
  }
});

// =============================================================
// CONNEXION (Utilisée par l'écran login)
// =============================================================
export function loginAdmin() {
  const email = document.getElementById("login-email")?.value;
  const pass = document.getElementById("login-pass")?.value;

  if (!email || !pass) return;

  signInWithEmailAndPassword(auth, email, pass)
    .then(() => {
      console.log("Connexion réussie !");
      // Le changement d'écran vers l'accueil est géré automatiquement par onAuthStateChanged
    })
    .catch((error) => {
      console.error("Erreur d'authentification :", error.message);
      const errEl = document.getElementById("login-error");
      if (errEl) errEl.textContent = "Identifiants incorrects ou accès refusé.";
    });
}

// =============================================================
// DÉCONNEXION (À lier à un bouton "Se déconnecter" si besoin)
// =============================================================
export function logoutAdmin() {
  signOut(auth).then(() => {
    console.log("Déconnexion réussie");
  });
}

// =============================================================
// ACCUEIL – Chargement dynamique Firestore
// =============================================================
export async function loadAccueil() {
  try {
    const configDoc = await getDoc(doc(db, "config", "activeAgent"));
    if (!configDoc.exists()) return;

    const agentId = configDoc.data().agentId;
    const agentDoc = await getDoc(doc(db, "agents", agentId));
    if (!agentDoc.exists()) return;

    const agent = agentDoc.data();

    const nomEl = document.getElementById("agent-nom");
    const uniteEl = document.getElementById("agent-unite");
    const posteEl = document.getElementById("agent-poste");
    const sessionEl = document.getElementById("agent-session");
    const photoEl = document.getElementById("agent-photo");
    const moisEl = document.getElementById("agent-mois");

    if (nomEl) nomEl.textContent = agent.nom || "";
    if (uniteEl) uniteEl.textContent = agent.unite || "";
    if (posteEl) posteEl.textContent = agent.poste || "";
    if (sessionEl) sessionEl.textContent = agent.session || "";
    if (photoEl) photoEl.src = agent.photo || "img/default.jpg";
    if (moisEl) moisEl.textContent = "1";

  } catch (err) {
    console.error("Erreur lors du chargement de l’accueil :", err);
  }
}

// =============================================================
// Import & Extraction PDF (SAMI)
// =============================================================
function initPdfImport() {
  const fileInput = document.getElementById("pdf-input");
  if (!fileInput) return;

  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await extractPdfText(file);
      if (typeof processSamiPdf === "function") processSamiPdf(text);
    } catch (err) {
      console.error("Erreur PDF :", err);
    }
  });
}

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(" ") + "\n";
  }
  return fullText;
}
