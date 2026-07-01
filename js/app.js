// =============================================================
// Firebase – Imports
// =============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
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
// Initialisation globale
// =============================================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Vision Essais – Application initialisée");

  // 1. Initialise les éléments de base
  initNavigation();
  initPdfImport();

  // 2. Charge l’écran d'accueil au démarrage
  await loadScreen("accueil");

  // 3. Tente de charger les données Firestore de l'agent actif
  tryLoadAccueil();

  // 🔁 Fonction de relance automatique si le DOM de l'accueil prend du temps à s'injecter
  function tryLoadAccueil(retry = 0) {
    const nomEl = document.getElementById("agent-nom");
    if (nomEl) {
      console.log("DOM prêt, chargement des données de l'accueil…");
      loadAccueil();
    } else if (retry < 5) {
      console.warn(`Éléments accueil non trouvés, nouvelle tentative (${retry + 1})…`);
      setTimeout(() => tryLoadAccueil(retry + 1), 500);
    } else {
      console.error("Impossible de charger l’accueil après plusieurs tentatives.");
    }
  }

  // 4. Gestion de l'état de connexion (uniquement pour l'affichage de la zone admin)
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("Admin connecté :", user.email);
      // On ne force plus loadScreen("admin") ici pour éviter d'écraser l'accueil au démarrage.
      // Le changement d'écran se fera quand l'utilisateur cliquera sur le menu.
    } else {
      console.log("Aucun admin connecté (Mode agent/invité)");
    }
  });
});

// =============================================================
// LOGIN ADMIN
// =============================================================
export function loginAdmin() {
  const email = document.getElementById("login-email")?.value;
  const pass = document.getElementById("login-pass")?.value;

  if (!email || !pass) {
    console.warn("Champs de connexion manquants.");
    return;
  }

  signInWithEmailAndPassword(auth, email, pass)
    .then(() => {
      console.log("Connexion réussie");
      loadScreen("admin");
      loadAgents();
    })
    .catch(() => {
      const errEl = document.getElementById("login-error");
      if (errEl) errEl.textContent = "Identifiants incorrects";
    });
}

// =============================================================
// LOGOUT
// =============================================================
export function logoutAdmin() {
  signOut(auth).then(() => {
    console.log("Déconnexion réussie");
    loadScreen("login");
  });
}

// =============================================================
// Firestore – Gestion des agents
// =============================================================

// Charger les agents dans l’admin
async function loadAgents() {
  const querySnapshot = await getDocs(collection(db, "agents"));
  const tbody = document.querySelector("#admin-list tbody");

  if (!tbody) return;
  tbody.innerHTML = "";

  querySnapshot.forEach((docSnap) => {
    const a = docSnap.data();
    const id = docSnap.id;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.nom}</td>
      <td>${a.unite}</td>
      <td>${a.poste}</td>
      <td>${a.session}</td>
      <td>
        <button class="btn-secondary" onclick="deleteAgent('${id}')">
          Supprimer
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Ajouter un agent
export async function addAgent() {
  const nom = document.getElementById("agent-nom")?.value;
  const unite = document.getElementById("agent-unite")?.value;
  const poste = document.getElementById("agent-poste")?.value;
  const session = document.getElementById("agent-session")?.value;

  await addDoc(collection(db, "agents"), {
    nom,
    unite,
    poste,
    session,
    photo: "img/default.jpg"
  });

  loadAgents();
}

// Supprimer un agent
export async function deleteAgent(id) {
  await deleteDoc(doc(db, "agents", id));
  loadAgents();
}

// =============================================================
// ACCUEIL – Chargement dynamique Firestore
// =============================================================
export async function loadAccueil() {
  console.log("Chargement accueil dynamique…");

  try {
    const configDoc = await getDoc(doc(db, "config", "activeAgent"));
    if (!configDoc.exists()) {
      console.error("Document config/activeAgent introuvable");
      return;
    }

    const agentId = configDoc.data().agentId;
    const agentDoc = await getDoc(doc(db, "agents", agentId));

    if (!agentDoc.exists()) {
      console.error("Agent actif introuvable :", agentId);
      return;
    }

    const agent = agentDoc.data();

    const nomEl = document.getElementById("agent-nom");
    const uniteEl = document.getElementById("agent-unite");
    const posteEl = document.getElementById("agent-poste");
    const sessionEl = document.getElementById("agent-session");
    const photoEl = document.getElementById("agent-photo");
    const moisEl = document.getElementById("agent-mois");

    if (!nomEl || !uniteEl || !posteEl || !sessionEl || !photoEl || !moisEl) {
      console.warn("Éléments accueil manquants dans le DOM.");
      return;
    }

    nomEl.textContent = agent.nom || "";
    uniteEl.textContent = agent.unite || "";
    posteEl.textContent = agent.poste || "";
    sessionEl.textContent = agent.session || "";

    const fallbackAvatar =
      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'><circle cx='75' cy='75' r='70' fill='%23ddd'/><text x='50%' y='55%' text-anchor='middle' font-size='20' fill='%23666'>Photo</text></svg>";

    photoEl.src = agent.photo || fallbackAvatar;
    moisEl.textContent = "1";

  } catch (err) {
    console.error("Erreur lors du chargement de l’accueil :", err);
  }
}

// =============================================================
// Import PDF
// =============================================================
function initPdfImport() {
  const fileInput = document.getElementById("pdf-input");

  if (!fileInput) {
    console.warn("Aucun champ d'import PDF trouvé (id='pdf-input').");
    return;
  }

  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log("Import PDF :", file.name);

    try {
      const text = await extractPdfText(file);
      console.log("Texte extrait :", text);

      if (typeof processSamiPdf === "function") {
        processSamiPdf(text);
      }

    } catch (err) {
      console.error("Erreur lors de l'extraction PDF :", err);
      alert("Impossible de lire le PDF.");
    }
  });
}

// =============================================================
// Extraction PDF via PDF.js
// =============================================================
async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(" ");
    fullText += pageText + "\n";
  }

  return fullText;
}
