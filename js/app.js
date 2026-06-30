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

  // Charge l’accueil au démarrage
  await loadScreen("accueil");
  setTimeout(() => loadAccueil(), 300);

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
      document.getElementById("login-error").textContent =
        "Identifiants incorrects";
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

    document.getElementById("agent-nom").textContent = agent.nom || "";
    document.getElementById("agent-unite").textContent = agent.unite || "";
    document.getElementById("agent-poste").textContent = agent.poste || "";
    document.getElementById("agent-session").textContent = agent.session || "";

    // Si la photo n'existe pas → avatar neutre en base64
    const fallbackAvatar =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAA...";
    
    document.getElementById("agent-photo").src =
      agent.photo ? agent.photo : fallbackAvatar;

    document.getElementById("agent-mois").textContent = "1";

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
