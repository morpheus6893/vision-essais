// =============================================================
// MODULE ADMIN – GESTION DES AGENTS
// =============================================================
import { collection, getDocs, addDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Note : On importe "db" depuis app.js
import { db } from "./app.js";

/**
 * Fonction d'initialisation appelée au chargement de l'écran admin
 */
export async function initAdmin() {
  console.log("Initialisation du module ADMIN...");
  await loadAdminTable();
  initAdminForm();
}

/**
 * Récupère et affiche la liste des agents depuis Firestore
 */
async function loadAdminTable() {
  try {
    const tableBody = document.getElementById("table-agents-body");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #999;">Chargement en cours...</td></tr>`;

    const querySnapshot = await getDocs(collection(db, "agents"));
    tableBody.innerHTML = ""; // Vide le tableau

    if (querySnapshot.empty) {
      tableBody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: #999;">Aucun agent enregistré.</td></tr>`;
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const agent = docSnap.data();
      const id = docSnap.id;

      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #ddd";
      tr.innerHTML = `
        <td style="padding: 12px;">${agent.nom || ""}</td>
        <td style="padding: 12px;">${agent.unite || ""}</td>
        <td style="padding: 12px;">${agent.poste || ""}</td>
        <td style="padding: 12px;">${agent.session || ""}</td>
        <td style="padding: 12px; text-align: center;">
          <button class="btn-delete" data-id="${id}" style="background-color: #d32f2f; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Supprimer</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Écouteurs pour la suppression d'un agent
    tableBody.querySelectorAll(".btn-delete").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const agentId = e.target.getAttribute("data-id");
        if (confirm("Voulez-vous vraiment supprimer cet agent ?")) {
          await deleteDoc(doc(db, "agents", agentId));
          loadAdminTable(); // Recharge locale
        }
      });
    });

  } catch (err) {
    console.error("Erreur lors du chargement de la liste des agents :", err);
  }
}

/**
 * Configure l'écouteur sur le bouton du formulaire d'ajout
 */
function initAdminForm() {
  const formBtn = document.querySelector(".card.upload-section button");
  if (!formBtn) return;

  // Nettoyage des écouteurs existants
  formBtn.replaceWith(formBtn.cloneNode(true));
  const newFormBtn = document.querySelector(".card.upload-section button");

  newFormBtn.addEventListener("click", async () => {
    const nom = document.querySelector("input[placeholder='Nom complet']")?.value;
    const unite = document.querySelector("input[placeholder='Ex : Essais Dijon']")?.value;
    const poste = document.querySelector("input[placeholder='Ex : Agent d’essais']")?.value;
    const session = document.querySelector("input[placeholder='Ex : 14 Bis']")?.value;

    if (!nom) {
      alert("Le nom de l'agent est obligatoire.");
      return;
    }

    try {
      await addDoc(collection(db, "agents"), {
        nom,
        unite,
        poste,
        session,
        photo: "img/default.jpg"
      });
      alert("Agent ajouté avec succès !");
      loadAdminTable(); // Rafraîchit le tableau
    } catch (err) {
      console.error("Erreur d'ajout de l'agent :", err);
    }
  });
}