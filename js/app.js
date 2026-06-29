// @ts-nocheck
// =============================================================
// Fichier principal : initialisation globale de l'application
// =============================================================

document.addEventListener("DOMContentLoaded", () => {

  console.log("Application démarrée.");

  // Initialisation du module SAMI
  if (typeof initSamiModule === "function") {
    initSamiModule();
  }

  // Initialisation du module Admin
  if (typeof refreshAdminList === "function") {
    refreshAdminList();
  }

  // Affichage de l'écran d'accueil par défaut
  if (typeof showScreen === "function") {
    showScreen("accueil");
  }

  // =============================================================
  // Import PDF SAMI (pdf.js)
  // =============================================================

  const inputPdf = document.getElementById("sami-pdf");

  if (inputPdf) {
    inputPdf.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const arrayBuffer = await file.arrayBuffer();

      // Lecture du PDF via pdf.js
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";

      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str).join(" ");
        fullText += strings + "\n";
      }

      console.log("Texte extrait du PDF :", fullText);

      // =============================================================
      // Pré-remplissage automatique basé sur TON PDF réel
      // =============================================================

      // -------- MODULE GS --------
      // Exemple PDF : "IGEC1201 - GS1 Généralités"
      if (/GS\s*1/i.test(fullText)) {
        document.getElementById("sami-gs").value = "GS1 - Tronc commun essais";
      }
      if (/GS\s*2/i.test(fullText)) {
        document.getElementById("sami-gs").value = "GS2 - Détection des circulations";
      }
      if (/GS\s*3/i.test(fullText)) {
        document.getElementById("sami-gs").value = "GS3 - Enclenchements / logiques";
      }

      // -------- DATE --------
      // Exemple PDF : "06/12/2024"
      const dateMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        const [day, month, year] = dateMatch[1].split("/");
        document.getElementById("sami-date").value = `${year}-${month}-${day}`;
      }

      // -------- FORMATEUR (Évaluateur) --------
      // Exemple PDF : "Prénom et NOM Formateur : Florian JEAN-ROBERT"
      const evalMatch = fullText.match(/Formateur\s*:\s*([A-Za-zÀ-ÖØ-öø-ÿ\s-]+)/i);
      if (evalMatch) {
        document.getElementById("sami-evaluateur").value = evalMatch[1].trim();
      }

      // -------- COMMENTAIRE GLOBAL --------
      // Exemple PDF : "REMARQUES : Bonne participation..."
      const commentMatch = fullText.match(/REMARQUES\s*:\s*(.+)/i);
      if (commentMatch) {
        document.getElementById("sami-commentaire").value = commentMatch[1].trim();
      }

      // -------- NIVEAU GLOBAL (optionnel) --------
      // Exemple PDF : "Bilan global de l'évaluation : Satisfaisant"
      const bilanMatch = fullText.match(/Bilan global de l[’']évaluation\s*:\s*([A-Za-z]+)/i);
      if (bilanMatch) {
        console.log("Niveau global détecté :", bilanMatch[1]);
      }

      alert("PDF importé ! Les champs ont été pré-remplis.");
    });
  }

});
