// @ts-nocheck
// =============================================================
// Module SAMI : gestion des évaluations, compétences, historique
// =============================================================

// Clé de stockage
const SAMI_STORAGE_KEY = "samiEvaluations";

// Données en mémoire
let samiEvaluations = loadJSON(SAMI_STORAGE_KEY, []);

// Sélecteurs principaux
const samiList = document.getElementById("sami-list");
const samiHistory = document.getElementById("sami-history");
const samiSynthesis = document.getElementById("sami-synthesis");
const samiCompetenceTable = document.querySelector("#sami-competence-list tbody");

// Champs du formulaire
const fieldGS = document.getElementById("sami-gs");
const fieldDate = document.getElementById("sami-date");
const fieldEvaluateur = document.getElementById("sami-evaluateur");
const fieldCompIntitule = document.getElementById("sami-comp-intitule");
const fieldCompNivVise = document.getElementById("sami-comp-niv-vise");
const fieldCompNivAtteint = document.getElementById("sami-comp-niv-atteint");
const fieldCommentaire = document.getElementById("sami-commentaire");

// Boutons
const btnAddCompetence = document.getElementById("btn-add-competence");
const btnSaveSami = document.getElementById("btn-save-sami");
const btnClearSami = document.getElementById("btn-clear-sami");

// Liste temporaire des compétences avant enregistrement
let tempCompetences = [];

// =============================================================
// Ajout d'une compétence dans la table temporaire
// =============================================================

btnAddCompetence?.addEventListener("click", () => {
  const intitule = fieldCompIntitule.value.trim();
  if (!intitule) return alert("Veuillez saisir une compétence.");

  const competence = {
    intitule,
    vise: fieldCompNivVise.value,
    atteint: fieldCompNivAtteint.value
  };

  tempCompetences.push(competence);
  renderTempCompetences();

  fieldCompIntitule.value = "";
});

/**
 * Affiche les compétences ajoutées dans la table temporaire
 */
function renderTempCompetences() {
  samiCompetenceTable.innerHTML = "";

  tempCompetences.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.intitule}</td>
      <td>${c.vise}</td>
      <td>${c.atteint}</td>
    `;
    samiCompetenceTable.appendChild(tr);
  });
}

// =============================================================
// Enregistrement d'une évaluation complète
// =============================================================

btnSaveSami?.addEventListener("click", () => {
  if (!fieldGS.value) return alert("Veuillez choisir un module GS.");
  if (tempCompetences.length === 0) return alert("Veuillez ajouter au moins une compétence.");

  const evaluation = {
    id: Date.now(),
    date: fieldDate.value || new Date().toLocaleDateString("fr-FR"),
    gs: fieldGS.value,
    evaluateur: fieldEvaluateur.value.trim(),
    commentaire: fieldCommentaire.value.trim(),
    competences: [...tempCompetences]
  };

  samiEvaluations.push(evaluation);
  saveJSON(SAMI_STORAGE_KEY, samiEvaluations);

  // Reset du formulaire
  tempCompetences = [];
  renderTempCompetences();
  fieldCommentaire.value = "";
  fieldCompIntitule.value = "";

  renderSamiList();
  renderHistory();
  renderSynthesis();

  alert("Évaluation enregistrée !");
});

// =============================================================
// Suppression d'une évaluation
// =============================================================

function deleteSamiEntry(id) {
  if (!confirm("Supprimer cette évaluation ?")) return;

  samiEvaluations = samiEvaluations.filter(e => e.id !== id);
  saveJSON(SAMI_STORAGE_KEY, samiEvaluations);

  renderSamiList();
  renderHistory();
  renderSynthesis();
}

window.deleteSamiEntry = deleteSamiEntry;

// =============================================================
// Rendu de la liste principale des évaluations
// =============================================================

function renderSamiList() {
  if (!samiList) return;

  samiList.innerHTML = "";

  if (samiEvaluations.length === 0) {
    samiList.innerHTML = `<p class="text-muted small">Aucune évaluation saisie pour le moment.</p>`;
    return;
  }

  samiEvaluations.forEach(ev => {
    const div = document.createElement("div");
    div.className = "sami-entry";

    div.innerHTML = `
      <div>
        <strong>${ev.gs}</strong> — <span class="text-muted small">${ev.date}</span><br>
        <em>${ev.commentaire || "Aucun commentaire"}</em><br>
        <span class="small">${ev.competences.length} compétence(s)</span>
      </div>
      <button class="btn-danger" onclick="deleteSamiEntry(${ev.id})">Supprimer</button>
    `;

    samiList.appendChild(div);
  });
}

// =============================================================
// Historique chronologique
// =============================================================

function renderHistory() {
  if (!samiHistory) return;

  samiHistory.innerHTML = "";

  if (samiEvaluations.length === 0) {
    samiHistory.innerHTML = `<p class="text-muted small">Aucun historique disponible.</p>`;
    return;
  }

  const sorted = [...samiEvaluations].sort((a, b) => b.id - a.id);

  sorted.forEach(ev => {
    const div = document.createElement("div");
    div.className = "history-entry";

    div.innerHTML = `
      <strong>${ev.date}</strong> — ${ev.gs}
      <span class="small">(${ev.competences.length} comp.)</span>
    `;

    samiHistory.appendChild(div);
  });
}

// =============================================================
// Synthèse S / A / M / I
// =============================================================

function renderSynthesis() {
  if (!samiSynthesis) return;

  if (samiEvaluations.length === 0) {
    samiSynthesis.innerHTML = `<p class="text-muted small">Aucune évaluation saisie pour le moment.</p>`;
    return;
  }

  let countS = 0, countA = 0, countM = 0, countI = 0;

  samiEvaluations.forEach(ev => {
    ev.competences.forEach(c => {
      if (c.atteint === "S") countS++;
      if (c.atteint === "A") countA++;
      if (c.atteint === "M") countM++;
      if (c.atteint === "I") countI++;
    });
  });

  samiSynthesis.innerHTML = `
    <p><strong>Total compétences évaluées :</strong> ${countS + countA + countM + countI}</p>
    <ul>
      <li><span class="badge badge-s">S</span> : ${countS}</li>
      <li><span class="badge badge-a">A</span> : ${countA}</li>
      <li><span class="badge badge-m">M</span> : ${countM}</li>
      <li><span class="badge badge-i">I</span> : ${countI}</li>
    </ul>
  `;
}

// =============================================================
// Effacer toutes les évaluations
// =============================================================

btnClearSami?.addEventListener("click", () => {
  if (!confirm("Effacer toutes les évaluations ?")) return;

  samiEvaluations = [];
  saveJSON(SAMI_STORAGE_KEY, samiEvaluations);

  renderSamiList();
  renderHistory();
  renderSynthesis();
});

// =============================================================
// Initialisation du module SAMI
// =============================================================

function initSamiModule() {
  renderTempCompetences();
  renderSamiList();
  renderHistory();
  renderSynthesis();
}

window.initSamiModule = initSamiModule;
