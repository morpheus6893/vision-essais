import { collection, getDocs, addDoc, deleteDoc, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./app.js";

// Stockage local des tuteurs pour l'attribution
let listeTuteursCache = [];

export async function initAdmin() {
  console.log("Initialisation du module ADMIN complet (Liaisons & Manager)...");
  
  // 1. Charger d'abord les utilisateurs pour identifier les tuteurs disponibles
  await loadUsersTable();
  initUserForm();

  // 2. Charger ensuite les agents (qui ont besoin de la liste des tuteurs)
  await updateTuteursDropdown();
  await loadAdminTable();
  initAgentFormFormulaire();
}

// =============================================================
// GESTION DES ACCÈS & UTILISATEURS (RÔLES + UNITÉS)
// =============================================================
async function loadUsersTable() {
  try {
    const tableBody = document.getElementById("table-users-body");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #999;">Chargement des accès...</td></tr>`;

    const querySnapshot = await getDocs(collection(db, "users"));
    tableBody.innerHTML = "";
    listeTuteursCache = []; // Reset

    querySnapshot.forEach((docSnap) => {
      const u = docSnap.data();
      const id = docSnap.id;

      // Si c'est un tuteur, on le met en cache pour le formulaire des agents
      if (u.role === "tuteur") {
        listeTuteursCache.push({ id: id, nomComplet: u.nomComplet || `${u.prenom} ${u.nom}` });
      }

      let badgeBg = "#cbd5e1"; let badgeColor = "#334155";
      if (u.role === "admin") { badgeBg = "#fef2f2"; badgeColor = "#991b1b"; }
      else if (u.role === "manager") { badgeBg = "#faf5ff"; badgeColor = "#6b21a8"; }
      else if (u.role === "tuteur") { badgeBg = "#eff6ff"; badgeColor = "#1e40af"; }
      else if (u.role === "apprenant") { badgeBg = "#f0fdf4"; badgeColor = "#166534"; }

      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #ddd";
      tr.innerHTML = `
        <td style="padding: 12px; font-weight: bold;">${u.nomComplet || u.nom || "Non renseigné"}</td>
        <td style="padding: 12px; color: #555;">
          <div>${u.email || ""}</div>
          <div style="font-size:0.75rem; color:#0056b3;">📍 ${u.unite || "Aucune unité définie"}</div>
        </td>
        <td style="padding: 12px;">
          <span style="padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; background: ${badgeBg}; color: ${badgeColor}; text-transform: uppercase;">
            ${u.role}
          </span>
        </td>
        <td style="padding: 12px; text-align: center; display: flex; justify-content: center; gap: 10px;">
          <button class="btn-edit-user" data-id="${id}" style="background: none; border: none; cursor: pointer; font-size: 1.1rem;" title="Modifier">✏️</button>
          <button class="btn-delete-user" data-id="${id}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.1rem;" title="Supprimer">🗑️</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // --- ÉVÉNEMENT : MODIFIER L'ACCÈS UTILISATEUR ---
    tableBody.querySelectorAll(".btn-edit-user").forEach(btn => {
      btn.addEventListener("click", () => {
        const idTarget = btn.dataset.id;
        querySnapshot.forEach((docSnap) => {
          if (docSnap.id === idTarget) {
            const u = docSnap.data();
            document.getElementById("admin-user-nom").value = u.nom || "";
            document.getElementById("admin-user-prenom").value = u.prenom || "";
            document.getElementById("admin-user-email").value = u.email || "";
            document.getElementById("admin-user-role").value = u.role || "apprenant";
            document.getElementById("admin-user-unite").value = u.unite || "";
            document.getElementById("admin-user-uid").value = (idTarget !== u.email) ? idTarget : "";
            
            const formTitle = document.querySelector("#form-creation-user").previousElementSibling;
            if (formTitle) formTitle.textContent = `📝 Modifier l'accès de ${u.prenom} ${u.nom}`;
          }
        });
      });
    });

    // --- ÉVÉNEMENT : SUPPRIMER L'ACCÈS UTILISATEUR ---
    tableBody.querySelectorAll(".btn-delete-user").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idTarget = btn.dataset.id;
        if (confirm(`Supprimer l'accès de ${idTarget} ?`)) {
          await deleteDoc(doc(db, "users", idTarget));
          initAdmin(); // Rafraîchissement complet
        }
      });
    });

  } catch (err) {
    console.error("Erreur chargement utilisateurs :", err);
  }
}

function initUserForm() {
  const newUserForm = document.getElementById("form-creation-user");
  if (!newUserForm) return;

  newUserForm.replaceWith(newUserForm.cloneNode(true));
  const form = document.getElementById("form-creation-user");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nom = document.getElementById("admin-user-nom").value.trim().toUpperCase();
    const prenom = document.getElementById("admin-user-prenom").value.trim();
    const email = document.getElementById("admin-user-email").value.trim().toLowerCase();
    const role = document.getElementById("admin-user-role").value;
    const unite = document.getElementById("admin-user-unite").value.trim();
    const uid = document.getElementById("admin-user-uid").value.trim();

    const docId = uid || email;

    try {
      await setDoc(doc(db, "users", docId), {
        nom, prenom,
        nomComplet: `${prenom} ${nom}`,
        email, role, unite,
        misAJourLe: new Date().toISOString()
      });
      alert("🎉 Utilisateur configuré avec succès !");
      form.reset();
      
      const formTitle = document.querySelector("#form-creation-user").previousElementSibling;
      if (formTitle) formTitle.textContent = "➕ Déclarer un accès utilisateur";

      await initAdmin();
    } catch (err) {
      console.error(err);
    }
  });
}

// =============================================================
// GESTION DES AGENTS (LIAISONS MODIFIABLES)
// =============================================================
function updateTuteursDropdown() {
  const select = document.getElementById("agent-form-tuteur");
  if (!select) return;
  select.innerHTML = '<option value="">-- Choisir un Tuteur Référent --</option>';
  listeTuteursCache.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id; opt.textContent = t.nomComplet;
    select.appendChild(opt);
  });
}

async function loadAdminTable() {
  try {
    const tableBody = document.getElementById("table-agents-body");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="4">Chargement...</td></tr>`;
    const querySnapshot = await getDocs(collection(db, "agents"));
    tableBody.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const agent = docSnap.data();
      const id = docSnap.id;

      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #ddd";
      tr.innerHTML = `
        <td style="padding: 12px;">
          <strong style="color:#0056b3;">${agent.nom || ""}</strong><br>
          <span style="font-size:0.8rem; color:#666;">${agent.poste || ""}</span>
        </td>
        <td style="padding: 12px;">
          <strong>${agent.unite || "Non assignée"}</strong><br>${agent.session || ""}
        </td>
        <td style="padding: 12px; color: #1e40af; font-weight: 500;">
          👤 ${agent.tuteurNom || "❌ Aucun tuteur lié"}
        </td>
        <td style="padding: 12px; text-align: center; gap: 5px; display: flex; justify-content: center;">
          <button class="btn-edit-agent" data-id="${id}" style="background-color: #f59e0b; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Modifier</button>
          <button class="btn-delete-agent" data-id="${id}" style="background-color: #d32f2f; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Supprimer</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // --- ÉVÉNEMENT : MODIFIER LA FICHE AGENT ---
    tableBody.querySelectorAll(".btn-edit-agent").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const snap = await getDocs(collection(db, "agents"));
        snap.forEach(d => {
          if(d.id === id) {
            const data = d.data();
            document.getElementById("agent-form-id").value = id;
            document.getElementById("agent-form-nom").value = data.nom || "";
            document.getElementById("agent-form-unite").value = data.unite || "";
            document.getElementById("agent-form-session").value = data.session || "";
            document.getElementById("agent-form-poste").value = data.poste || "";
            document.getElementById("agent-form-tuteur").value = data.tuteurId || "";
            
            // Chargement de la chaîne Base64 ou de l'URL dans l'aperçu circulaire
            const previewImg = document.getElementById("agent-form-preview");
            if (previewImg) {
              previewImg.src = data.photo || "img/default.jpg";
            }
            
            const fileInput = document.getElementById("agent-form-file");
            if (fileInput) fileInput.value = "";

            document.getElementById("agent-form-title").textContent = `✏️ Modifier la fiche de ${data.nom}`;
          }
        });
      });
    });

    // --- ÉVÉNEMENT : SUPPRIMER LA FICHE AGENT ---
    tableBody.querySelectorAll(".btn-delete-agent").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (confirm("Supprimer cet agent ?")) {
          await deleteDoc(doc(db, "agents", btn.dataset.id));
          loadAdminTable();
        }
      });
    });

  } catch (err) { console.error(err); }
}

function initAgentFormFormulaire() {
  const fileInput = document.getElementById("agent-form-file");
  const previewImg = document.getElementById("agent-form-preview");

  // --- INTERCEPTION ET CONVERSION DE L'IMAGE EN BASE64 ---
  if (fileInput && previewImg) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 1500000) {
          alert("L'image est trop volumineuse. Veuillez choisir une image de moins de 1.5 Mo.");
          fileInput.value = "";
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          previewImg.src = event.target.result; // Assigne le Base64 à l'aperçu
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const btn = document.getElementById("btn-save-agent");
  if (!btn) return;

  btn.replaceWith(btn.cloneNode(true));
  const newBtn = document.getElementById("btn-save-agent");

  newBtn.addEventListener("click", async () => {
    const id = document.getElementById("agent-form-id").value;
    const nom = document.getElementById("agent-form-nom").value.trim();
    const unite = document.getElementById("agent-form-unite").value.trim();
    const session = document.getElementById("agent-form-session").value.trim();
    const poste = document.getElementById("agent-form-poste").value.trim();
    
    // Récupération de l'image présente dans l'aperçu au moment du clic
    const currentPreview = document.getElementById("agent-form-preview");
    const photo = currentPreview ? currentPreview.src : "img/default.jpg";
    
    const tuteurSelect = document.getElementById("agent-form-tuteur");
    const tuteurId = tuteurSelect.value;
    const tuteurNom = tuteurSelect.options[tuteurSelect.selectedIndex]?.text || "";

    if (!nom) return alert("Le nom de l'agent est requis.");

    const payload = {
      nom, unite, session, poste,
      tuteurId,
      tuteurNom: tuteurId ? tuteurNom : "Non renseigné",
      photo: photo
    };

    try {
      if (id) {
        await setDoc(doc(db, "agents", id), payload, { merge: true });
        alert("Fiche agent mise à jour !");
      } else {
        await addDoc(collection(db, "agents"), payload);
        alert("Nouvel agent créé !");
      }
      
      // Reset complet du formulaire après traitement
      document.getElementById("agent-form-id").value = "";
      document.getElementById("agent-form-nom").value = "";
      document.getElementById("agent-form-unite").value = "";
      document.getElementById("agent-form-session").value = "";
      document.getElementById("agent-form-poste").value = "";
      document.getElementById("agent-form-tuteur").value = "";
      
      if (fileInput) fileInput.value = ""; 
      if (previewImg) previewImg.src = "img/default.jpg"; 
      
      document.getElementById("agent-form-title").textContent = "Créer ou Modifier une fiche Agent";
      
      loadAdminTable();
    } catch(err) { console.error(err); }
  });
}
