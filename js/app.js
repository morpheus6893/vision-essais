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
  doc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =============================================================
// Firebase – Configuration (à remplacer par la tienne)
// =============================================================
const firebaseConfig = {
  apiKey: "XXX",
  authDomain: "XXX",
  projectId: "XXX",
  storageBucket: "XXX",
  messagingSenderId: "XXX",
  appId: "XXX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =============================================================
// Navigation
// =============================================================
import { initNavigation, showScreen } from "./navigation.js";

// =============================================================
// Initialisation globale
// =============================================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("Vision Essais – Application initialisée");

  initNavigation();
  initPdfImport();

  // Protection automatique des écrans
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("Admin connecté :", user.email);
      showScreen("admin");   // accès admin
      loadAgents();          // charge les agents depuis Firestore
    } else {
      console.log("Aucun admin connecté");
      showScreen("login");   // écran login
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
      showScreen("admin");
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
    showScreen("login");
  });
}

// =============================================================
// Firestore – Gestion des agents
// =============================================================

// Charger les agents
async function loadAgents() {
  const querySnapshot = await getDocs(collection(db, "agents"));
  const tbody = document.querySelector("#admin-list tbody");

  if (!tbody) return; // si admin.html pas encore chargé

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
    session
  });

  loadAgents();
}

// Supprimer un agent
export async function deleteAgent(id) {
  await deleteDoc(doc(db, "agents", id));
  loadAgents();
}

// =============================================================
// Import PDF (inchangé)
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
// Extraction du texte d'un PDF via PDF.js
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
