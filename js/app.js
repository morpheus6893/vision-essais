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
  getDoc,
  setDoc
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
export const db = getFirestore(app);

// 🔐 Stockage global des informations utilisateur (sécurité et périmètre)
let roleUtilisateurActuel = "apprenant";
let uniteUtilisateurActuel = "";

// =============================================================
// Navigation & Modules Métiers
// =============================================================
import { initNavigation, loadScreen } from "./navigation.js?v=2";
import { initParcours } from "./parcours.js"; // 📘 Suivi de parcours

// =============================================================
// Initialisation globale & Sécurisation des routes
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("Vision Essais – Application initialisée");

  // Initialise les écouteurs de clics sur la barre de navigation globale
  initNavigation();
  initPdfImport();

  // Écouteur global sur la barre de navigation pour capter quand on clique sur "Parcours"
  const mainNav = document.querySelector(".main-nav");
  if (mainNav) {
    mainNav.addEventListener("click", (e) => {
      // Si on clique sur le bouton parcours
      if (e.target.closest('[data-screen="parcours"]') || e.target.textContent.includes("Parcours")) {
        // Laisse une infime fraction de seconde à loadScreen pour injecter le HTML, puis initialise avec le rôle
        setTimeout(() => {
          initParcours(roleUtilisateurActuel);
        }, 150);
      }
      // Si on retourne sur l'accueil, on recharge les datas de l'agent
      if (e.target.closest('[data-screen="accueil"]') || e.target.textContent.includes("Accueil")) {
        setTimeout(() => tryLoadAccueil(), 150);
      }
    });
  }

  // 🔒 LE GARDIEN : Surveillance en temps réel de l'état de connexion
  onAuthStateChanged(auth, async (user) => {
    const navBar = document.querySelector(".main-nav");

    if (user) {
      console.log("Utilisateur connecté :", user.email);
      if (navBar) navBar.classList.remove("hidden");

      try {
        // 🕵️‍♂️ Récupération du rôle et de l'unité dans Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          roleUtilisateurActuel = data.role || "apprenant";
          uniteUtilisateurActuel = data.unite || "";
          console.log(`[Auth] Profil chargé. Rôle : ${roleUtilisateurActuel} | Unité : ${uniteUtilisateurActuel}`);
        } else {
          console.warn("[Auth] Aucun profil trouvé dans la collection 'users'. Rôle restreint à 'apprenant'.");
          roleUtilisateurActuel = "apprenant";
          uniteUtilisateurActuel = "";
        }
      } catch (err) {
        console.error("[Auth] Erreur lors du chargement du rôle utilisateur :", err);
        roleUtilisateurActuel = "apprenant";
        uniteUtilisateurActuel = "";
      }

      // 🎯 CONFIGURATION DU SÉLECTEUR D'APPRENANT (Filtrage par Rôles et Périmètres)
      await setupGlobalSelecteur();

      // Charge l'écran d'accueil par défaut
      await loadScreen("accueil");
      tryLoadAccueil();
    } else {
      console.log("Aucun utilisateur connecté -> Redirection forcée");
      if (navBar) navBar.classList.add("hidden");
      
      const container = document.getElementById("selecteur-apprenant-container");
      if (container) container.style.display = "none"; 
      
      roleUtilisateurActuel = "apprenant"; // Réinitialisation du rôle
      uniteUtilisateurActuel = "";
      loadScreen("login");
    }
  });

  // 🔁 Relance automatique si le DOM de l'accueil prend du temps à s'injecter
  function tryLoadAccueil(retry = 0) {
    const nomEl = document.getElementById("agent-nom");
    if (nomEl) {
      loadAccueil();
    } else if (retry < 5) {
      setTimeout(() => tryLoadAccueil(retry + 1), 300);
    }
  }
});

// =============================================================
// LOGIQUE DU SÉLECTEUR D'APPRENANT GLOBAL
// =============================================================
async function setupGlobalSelecteur() {
  const container = document.getElementById("selecteur-apprenant-container");
  const select = document.getElementById("global-select-apprenant");
  
  if (!container || !select) return;

  // Si l'utilisateur est un simple apprenant, on cache complètement le sélecteur
  if (roleUtilisateurActuel === "apprenant") {
    container.style.display = "none";
    return;
  }

  try {
    // 1. Récupérer l'agent actuellement sélectionné globalement
    const configDoc = await getDoc(doc(db, "config", "activeAgent"));
    const activeAgentId = configDoc.exists() ? configDoc.data().agentId : null;

    // 2. Charger tous les agents de la base
    const querySnapshot = await getDocs(collection(db, "agents"));
    select.innerHTML = ""; // Vider le sélecteur

    if (querySnapshot.empty) {
      select.innerHTML = `<option value="">Aucun agent disponible</option>`;
      container.style.display = "block";
      return;
    }

    let nbAgentsVisibles = 0;

    // 3. Remplir les choix du select selon le niveau d'accès réel
    querySnapshot.forEach((docSnap) => {
      const agent = docSnap.data();
      let aLeDroitDeVoir = false;

      if (roleUtilisateurActuel === "admin") {
        // L'admin a une vision totale sur l'ensemble du réseau
        aLeDroitDeVoir = true;
      } 
      else if (roleUtilisateurActuel === "manager") {
        // Le manager ne voit que sa structure / unité (ex: PEI Dijon)
        if (agent.unite && agent.unite.trim().toLowerCase() === uniteUtilisateurActuel.trim().toLowerCase()) {
          aLeDroitDeVoir = true;
        }
      } 
      else if (roleUtilisateurActuel === "tuteur") {
        // Le tuteur ne voit que les agents dont l'identifiant tuteur concorde (UID ou email de liaison)
        const currentUser = auth.currentUser;
        if (agent.tuteurId && (agent.tuteurId === currentUser.uid || agent.tuteurId === currentUser.email)) {
          aLeDroitDeVoir = true;
        }
      }

      if (aLeDroitDeVoir) {
        nbAgentsVisibles++;
        const option = document.createElement("option");
        option.value = docSnap.id;
        option.textContent = `${agent.nom} (${agent.unite || "Sans unité"})`;
        if (docSnap.id === activeAgentId) {
          option.selected = true;
        }
        select.appendChild(option);
      }
    });

    // 4. Gestion de l'affichage du conteneur selon le nombre de profils trouvés
    if (nbAgentsVisibles > 0) {
      container.style.display = "block";
    } else {
      select.innerHTML = `<option value="">Aucun agent lié à votre périmètre</option>`;
      container.style.display = "block";
      return;
    }

    // 5. Écouter les changements de sélection (et purger les écouteurs précédents)
    select.replaceWith(select.cloneNode(true));
    const newSelect = document.getElementById("global-select-apprenant");

    newSelect.addEventListener("change", async (e) => {
      const nouveauAgentId = e.target.value;
      if (!nouveauAgentId) return;

      console.log(`[Sélecteur] Changement de cible vers l'agent ID : ${nouveauAgentId}`);
      
      try {
        // Enregistrement de la configuration d'aiguillage dans Firestore
        await setDoc(doc(db, "config", "activeAgent"), {
          agentId: nouveauAgentId,
          misAJourLe: new Date().toISOString()
        });
        
        // Rafraîchissement direct de la vue d'accueil
        await loadScreen("accueil");
        await loadAccueil();
        
        alert(`Bascule réussie ! Consultation du livret de : ${newSelect.options[newSelect.selectedIndex].text}`);
      } catch (err) {
        console.error("Erreur lors de la modification de l'agent actif :", err);
        alert("Action refusée : Impossible de modifier l'agent cible.");
      }
    });

  } catch (err) {
    console.error("Erreur lors du paramétrage du sélecteur global :", err);
  }
}

// =============================================================
// CONNEXION
// =============================================================
export function loginAdmin() {
  const email = document.getElementById("login-email")?.value;
  const pass = document.getElementById("login-pass")?.value;

  if (!email || !pass) return;

  signInWithEmailAndPassword(auth, email, pass)
    .then(() => {
      console.log("Connexion réussie !");
    })
    .catch((error) => {
      console.error("Erreur d'authentification :", error.message);
      const errEl = document.getElementById("login-error");
      if (errEl) errEl.textContent = "Identifiants incorrects ou accès refusé.";
    });
}

// =============================================================
// DÉCONNEXION
// =============================================================
export function logoutAdmin() {
  signOut(auth).then(() => {
    console.log("Déconnexion réussie");
  });
}

// =============================================================
// ACCUEIL – Chargement dynamique Firestore (Agent + Tuteur)
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

    const tuteurNomEl = document.getElementById("tuteur-nom");
    const tuteurFonctionEl = document.getElementById("tuteur-fonction");
    const tuteurMailEl = document.getElementById("tuteur-mail");

    if (tuteurNomEl) tuteurNomEl.textContent = agent.tuteurNom || "Non renseigné";
    if (tuteurFonctionEl) tuteurFonctionEl.textContent = agent.tuteurFonction || "";
    if (tuteurMailEl) tuteurMailEl.textContent = agent.tuteurMail || "";

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
