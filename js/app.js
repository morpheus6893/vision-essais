// =============================================================
// Point d'entrée principal de l'application Vision Essais
// =============================================================

import { initNavigation } from "./navigation.js";

// =============================================================
// Initialisation globale
// =============================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("Vision Essais – Application initialisée");

  // Initialiser la navigation
  initNavigation();

  // Préparer l'import PDF
  initPdfImport();
});

// =============================================================
// Gestion de l'import PDF
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

      // Si un module SAMI existe, on lui transmet le texte
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
