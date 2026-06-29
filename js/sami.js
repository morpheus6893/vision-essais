// =============================================================
// Module SAMI – Vision Essais
// =============================================================

// Stockage local
const STORAGE_KEY = "visionEssais_sami_evaluations";

// =============================================================
// Initialisation de l'écran SAMI
// =============================================================

export function initSami() {
  console.log("SAMI : écran initialisé");

  const btnAdd = document.getElementById("btn-add-competence");
  const btnSave = document.getElementById("btn-save-sami");
  const btnClear = document.getElementById("btn-clear-sami");

  if (btnAdd) btnAdd.addEventListener("click", addCompetence);
  if (btnSave) btnSave.addEventListener("click", saveEvaluation);
  if (btnClear) btnClear.addEventListener("click", clearForm);

  renderCompetenceList([]);
  renderHistory();
  renderSynthesis();
}

// =============================================================
// Ajout d'une compétence dans le tableau
// =============================================================

function addCompetence() {
  const intitule = document.getElementById("sami-comp-intitule").value.trim();
  const vise = document.getElementById("sami-comp-niv-vise").value;
  const atteint = document.getElementById("sami-comp-niv-atteint").value;

  if (!intitule) {
    alert("Veuillez saisir un intitulé de compétence.");
    return;
  }

  const table = document.getElementById("sami-competence-list");
  const row = document.createElement("tr");

  row.innerHTML = `
    <td>${intitule}</td>
    <td>${vise}</td>
    <td>${atteint}</td>
    <td><button class="delete-comp">Supprimer</button></td>
  `;

  table.appendChild(row);

  row.querySelector(".delete-comp").addEventListener("click", () => {
    row.remove();
  });
}

// =============================================================
// Sauvegarde d'une évaluation SAMI
// =============================================================

function saveEvaluation() {
  const gs = document.getElementById("sami-gs").value;
  const date = document.getElementById("sami-date").value;
  const evaluateur = document.getElementById("sami-evaluateur").value;
  const commentaire = document.getElementById("sami-commentaire").value;

  const competences = [];
  document.querySelectorAll("#sami-competence-list tr").forEach(row => {
    const cells = row.querySelectorAll("td");
    competences.push({
      intitule: cells[0].innerText,
      vise: cells[1].innerText,
      atteint: cells[2].innerText
    });
  });

  const evaluation = {
    id: Date.now(),
    gs,
    date,
    evaluateur,
    commentaire,
    competences
  };

  const all = loadAllEvaluations();
  all.push(evaluation);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

  alert("Évaluation enregistrée.");
  renderHistory();
  renderSynthesis();
  clearForm();
}

// =============================================================
// Nettoyage du formulaire
// =============================================================

function clearForm() {
  document.getElementById("sami-gs").value = "";
  document.getElementById("sami-date").value = "";
  document.getElementById("sami-evaluateur").value = "";
  document.getElementById("sami-commentaire").value = "";
  document.getElementById("sami-competence-list").innerHTML = "";
}

// =============================================================
// Chargement des évaluations
// =============================================================

function loadAllEvaluations() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

// =============================================================
// Affichage de l'historique
// =============================================================

function renderHistory() {
  const container = document.getElementById("sami-history");
  if (!container) return;

  const all = loadAllEvaluations();

  container.innerHTML = all
    .map(ev => `
      <div class="history-item">
        <strong>${ev.gs}</strong> – ${ev.date} – ${ev.evaluateur}<br>
        ${ev.competences.length} compétence(s)
      </div>
    `)
    .join("");
}

// =============================================================
// Synthèse S / A / M / I
// =============================================================

function renderSynthesis() {
  const container = document.getElementById("sami-synthesis");
  if (!container) return;

  const all = loadAllEvaluations();

  const stats = { S: 0, A: 0, M: 0, I: 0 };

  all.forEach(ev => {
    ev.competences.forEach(c => {
      if (stats[c.atteint] !== undefined) {
        stats[c.atteint]++;
      }
    });
  });

  container.innerHTML = `
    <ul>
      <li>S : ${stats.S}</li>
      <li>A : ${stats.A}</li>
      <li>M : ${stats.M}</li>
      <li>I : ${stats.I}</li>
    </ul>
  `;
}

// =============================================================
// Traitement du PDF importé
// =============================================================

export function processSamiPdf(text) {
  console.log("Traitement PDF SAMI…");

  // Exemple simple : extraction du GS
  const gsMatch = text.match(/GS ?(\d+)/i);
  if (gsMatch) {
    document.getElementById("sami-gs").value = "GS" + gsMatch[1];
  }

  // Exemple : extraction du formateur
  const evalMatch = text.match(/Évaluateur ?: ([A-Za-zÀ-ÖØ-öø-ÿ ]+)/i);
  if (evalMatch) {
    document.getElementById("sami-evaluateur").value = evalMatch[1].trim();
  }

  // Exemple : extraction de la date
  const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (dateMatch) {
    document.getElementById("sami-date").value = dateMatch[1];
  }

  alert("PDF analysé et champs pré-remplis.");
}
