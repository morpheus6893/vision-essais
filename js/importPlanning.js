// =======================================================================
// MODULE IMPORT PLANNING – PARSING DE CALENDRIER PDF DE SESSION
// =======================================================================

import { db } from "./app.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const PDFJS_WORKER_URL = "libs/pdfjs/pdf.worker.js";

export async function initImportPlanning() {
  console.log("Initialisation du module d'importation des plannings...");
  
  const dropZone = document.getElementById("drop-zone-planning");
  const fileInput = document.getElementById("file-planning");

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#28a745"; 
    dropZone.style.backgroundColor = "#e8f5e9";
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "#ccc";
    dropZone.style.backgroundColor = "transparent";
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#ccc";
    dropZone.style.backgroundColor = "transparent";
    
    if (e.dataTransfer.files.length > 0) {
      handlePlanningFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handlePlanningFile(e.target.files[0]);
    }
  });
}

function handlePlanningFile(file) {
  if (file.type !== "application/pdf") {
    showPlanningStatus("Erreur : Le fichier doit être au format PDF.", "error");
    return;
  }

  showPlanningStatus(`Analyse du planning : ${file.name}...`, "info");

  if (window['pdfjs-dist/build/pdf']) {
    window['pdfjs-dist/build/pdf'].GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    window['pdfjs-dist/build/pdf'].verbosity = 0; 
  } else if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.verbosity = 0;
  }

  const reader = new FileReader();
  reader.onload = async function (e) {
    const typedarray = new Uint8Array(e.target.result);
    try {
      const pdfjsLibInstance = window['pdfjs-dist/build/pdf'] || pdfjsLib;
      const pdf = await pdfjsLibInstance.getDocument(typedarray).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // On sépare temporairement par un espace pour l'analyse globale
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += `--- PAGE ${i} ---\n` + pageText + "\n";
      }

      parseAndSavePlanning(fullText);

    } catch (err) {
      console.error("Erreur PDF.js Planning :", err);
      showPlanningStatus("Erreur lors de la lecture du calendrier PDF.", "error");
    }
  };
  reader.readAsArrayBuffer(file);
}

/**
 * Étape 2 : Extraction robuste et intelligente par bloc Regex
 */
async function parseAndSavePlanning(text) {
  try {
    // 1. Détection adaptative du numéro de session (ex: cherche "26.2")
    const sessionMatch = text.match(/Session\s*([0-9\.]+)/i) || text.match(/(\d{2}\.\d)/);
    let cleanSessionNumber = sessionMatch ? sessionMatch[1].trim() : "Inconnue";

    if (cleanSessionNumber === "Inconnue" || cleanSessionNumber === "") {
      showPlanningStatus("Erreur : Impossible de détecter le numéro de session (ex: 26.2) dans le PDF.", "error");
      return;
    }

    // ID de document normalisé en minuscules (ex: session_26_2)
    const docId = `session_${cleanSessionNumber.replace(/[\.\s\-]/g, "_")}`.toLowerCase();
    let etapesExtraites = [];

    // 2. REGEX NATIVE : Capture un code cours suivi de n'importe quel texte contenant deux dates JJ/MM/AAAA
    // Ignore les bruits de sauts de ligne (\s\S) et l'éparpillement des données
    const globalBlockRegex = /([A-Z]{2,4}\d{4,6}|à définir|Stage|Filière)([\s\S]*?)(\d{2}\/\d{2}\/\d{4})([\s\S]*?)(\d{2}\/\d{2}\/\d{4})/gi;
    
    let match;
    while ((match = globalBlockRegex.exec(text)) !== null) {
      const code = match[1].toUpperCase();
      const blocTexteIntermediaire = match[2] + " " + match[4];
      const dateDebut = match[3];
      const dateFin = match[4].match(/\d{2}\/\d{2}\/\d{4}/) ? match[4].match(/\d{2}\/\d{2}\/\d{4}/)[0] : match[5];

      // Nettoyage des zéros isolés ("0 0 0") induits par les cellules vides du PDF
      let cleanContent = blocTexteIntermediaire
        .replace(/[\r\n]+/g, " ")
        .replace(/\b0\b/g, "")
        .replace(/\s+/g, " ")
        .trim();

      // Extraction de l'intitulé du module en retirant les données parasites
      let titre = cleanContent
        .replace(/u\.d\.i/i, "")
        .replace(/teams/i, "")
        .replace(/nanterre/i, "")
        .replace(/\b\d+j\b/i, "")
        .replace(/\b\d+\s*sem\b/i, "")
        .replace(/["',]+/g, "")
        .replace(/\bpar\s+\d+\b/i, "") // 🎯 Supprime les résidus de mise en page comme "par 3", "par 2"
        .replace(/\b\d+\b/g, "")       // Nettoie les chiffres isolés qui se baladent
        .replace(/\s+/g, " ")
        .trim();

      // 🎯 Sécurité renforcée : si le titre est trop court, vide ou dénué de lettres, on utilise un fallback explicite
      if (!titre || titre.length < 4 || /^[^a-zA-Z]+$/.test(titre)) {
        titre = `Module de formation ${code}`;
      }

      // Normalisation du Lieu
      let lieu = "Nanterre / UDI";
      const contentLower = cleanContent.toLowerCase();
      if (contentLower.includes("teams")) lieu = "Teams";
      else if (contentLower.includes("e-learning")) lieu = "E-Learning";
      else if (contentLower.includes("infrapole") || contentLower.includes("infrapõle")) lieu = "Infrapôle";
      else if (contentLower.includes("groupe es")) lieu = "Groupe ES";
      else if (contentLower.includes("udi")) lieu = "UDI";
      else if (contentLower.includes("nanterre")) lieu = "Nanterre";

      // Extraction de la durée
      let duree = "1 sem";
      const dureeMatch = cleanContent.match(/(\d+(?:\.\d+)?\s*(?:sem|j|jours))/i);
      if (dureeMatch) {
        duree = dureeMatch[1];
      }

      // Détermination de la catégorie
      let type = "gs";
      if (contentLower.includes("stage") || contentLower.includes("terrain") || contentLower.includes("etude")) {
        type = "stage";
      } else if (contentLower.includes("fil rouge") || contentLower.includes("game") || contentLower.includes("essai")) {
        type = "bilan";
      } else if (contentLower.includes("e-learning") || contentLower.includes("tronc commun")) {
        type = "socle";
      }

      etapesExtraites.push({
        code,
        titre,
        lieu,
        duree,
        debut: dateDebut,
        fin: dateFin,
        type
      });
    }

    // 3. Système de secours basé uniquement sur la chronologie des dates si la structure du tableau échoue
    if (etapesExtraites.length === 0) {
      const toutesLesDates = text.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
      if (toutesLesDates.length >= 2) {
        for (let j = 0; j < toutesLesDates.length - 1; j += 2) {
          etapesExtraites.push({
            code: `MODULE_${j / 2 + 1}`,
            titre: "Module de formation (Ajusté)",
            lieu: "Nanterre / UDI",
            duree: "1 sem",
            debut: toutesLesDates[j],
            fin: toutesLesDates[j + 1],
            type: "gs"
          });
        }
      }
    }

    if (etapesExtraites.length === 0) {
      showPlanningStatus("Aucun module détecté. Format de tableau incompatible.", "error");
      return;
    }

    // 4. Alignement chronologique
    etapesExtraites.sort((a, b) => {
      const dateA = new Date(a.debut.split('/').reverse().join('-'));
      const dateB = new Date(b.debut.split('/').reverse().join('-'));
      return dateA - dateB;
    });

    // 5. Persistence dans Firestore
    await setDoc(doc(db, "sessions", docId), {
      nom: cleanSessionNumber,
      etapes: etapesExtraites,
      dateImport: new Date().toISOString()
    });

    showPlanningStatus(`Succès ! Le planning de la Session ${cleanSessionNumber} (${etapesExtraites.length} modules) a été enregistré.`, "success");

  } catch (err) {
    console.error("Erreur lors du parsing du planning :", err);
    showPlanningStatus("L'analyse du calendrier a échoué.", "error");
  }
}

function showPlanningStatus(msg, type) {
  const statusEl = document.getElementById("planning-status");
  if (!statusEl) return;
  statusEl.textContent = msg;
  if (type === "success") { statusEl.style.color = "green"; statusEl.style.fontWeight = "bold"; }
  else if (type === "error") { statusEl.style.color = "red"; statusEl.style.fontWeight = "bold"; }
  else { statusEl.style.color = "#666"; }
}