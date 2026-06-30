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
import { initNavigation, loadScreen } from "./navigation.js";

// =============================================================
// Initialisation globale
// =============================================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Vision Essais – Application initialisée");

  initNavigation();
  initPdfImport();

  // Charge l’écran accueil au démarrage
  await loadScreen("accueil");

  // Attends que le DOM soit prêt avant de remplir l’accueil
  setTimeout(() => {
    const nomEl = document.getElementById("agent-nom");
    if (nomEl) {
      loadAccueil();
    } else {
      console.warn("Éléments accueil non trouvés, chargement différé.");
    }
  }, 500);

  // Gestion de la connexion admin
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("Admin connecté :", user.email);
      loadScreen("admin");
      loadAgents();
    } else {
      console.log("Aucun admin connecté");
      loadScreen("login");
    }
  });

  // Attache le bouton de connexion (évite l'erreur loginAdmin non défini)
  const loginBtn = document.getElementById("login-btn");
  if (loginBtn) loginBtn.addEventListener("click", loginAdmin);
});

// =============================================================
// LOGIN ADMIN
// =============================================================
export function loginAdmin() {
  const email = document.getElementById("login-email").value;
  const pass = document.getElementById("login-pass").value;

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
  const nom = document.getElementById("agent-nom").value;
  const unite = document.getElementById("agent-unite").value;
  const poste = document.getElementById("agent-poste").value;
  const session = document.getElementById("agent-session").value;

  await addDoc(collection(db, "agents"), {
    nom,
    unite,
    poste,
    session,
    photo: "img/default.jpg" // sécurité si pas de photo
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

    // Remplissage des champs
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

    // Avatar neutre si pas de photo
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
