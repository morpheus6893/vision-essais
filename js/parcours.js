import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./app.js";

export async function initParcours() {
  console.log("Initialisation de l'onglet Parcours (Frise chronologique & Calendrier)...");
  
  const selectAgent = document.querySelector("select") || document.getElementById("global-agent-selector");
  
  if (selectAgent && !selectAgent.dataset.listenerActive) {
    selectAgent.addEventListener("change", () => {
      console.log("Changement d'agent détecté dans Parcours -> Rechargement...");
      renderTimelineAndPlanning();
    });
    selectAgent.dataset.listenerActive = "true"; 
  }

  renderTimelineAndPlanning();
}

async function renderTimelineAndPlanning() {
  const timelineContainer = document.getElementById("parcours-timeline-container");
  const selectAgent = document.querySelector("select") || document.getElementById("global-agent-selector");
  
  let agentId = selectAgent ? selectAgent.value : null;
  if (!agentId) {
    agentId = localStorage.getItem("selectedAgentId") || localStorage.getItem("currentAgentId");
  }

  if (!agentId || agentId === "") {
    if (timelineContainer) {
      timelineContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#666;">⚠️ Veuillez sélectionner un agent dans le menu supérieur pour afficher son livret.</div>`;
    }
    clearPlanningContainer("Veuillez sélectionner un agent pour charger le calendrier officiel...");
    return;
  }

  try {
    const agentSnap = await getDoc(doc(db, "agents", agentId));
    
    if (!agentSnap.exists()) {
      if (timelineContainer) timelineContainer.innerHTML = `<p style="text-align:center; color:#94a3b8; padding:20px;">Aucune donnée trouvée pour cet agent.</p>`;
      return;
    }

    const agentData = agentSnap.data();
    console.log("Données complètes de l'agent chargé :", agentData);
    
    // 🎯 NETTOYAGE ULTRA-STRICT DE LA SESSION (Enlève les retours à la ligne \n, espaces et textes superflus)
    let rawSession = agentData.session || "";
    let cleanSessionNumber = "";
    
    // Extrait uniquement les chiffres et les points au tout début (ex: "26.2")
    const match = rawSession.trim().match(/^([0-9\.]+)/);
    if (match) {
      cleanSessionNumber = match[1]; 
    } else {
      cleanSessionNumber = rawSession.trim(); 
    }

    const sessionTitleEl = document.getElementById("session-page-title");
    if (sessionTitleEl) {
      sessionTitleEl.textContent = `Mon parcours sur 12 mois – Session ${cleanSessionNumber || rawSession}`;
    }

    // 🎨 RETOUR AU DESIGN QUI FONCTIONNAIT PARFAITEMENT (HTML Inline propre, pas de classes CSS cassées)
    if (timelineContainer) {
      renderMilestonesBeautifulDesign(timelineContainer, agentData);
    }

    // 📅 CHARGEMENT DU CALENDRIER
    if (cleanSessionNumber) {
      const docSessionId = `session_${cleanSessionNumber.replace(/[\.\s\-]/g, "_")}`;
      await fetchAndRenderPlanning(docSessionId, rawSession.trim());
    } else {
      clearPlanningContainer("Aucune session valide associée à cet agent.");
    }

  } catch (err) {
    console.error("Erreur globale lors du rendu de l'écran parcours :", err);
    clearPlanningContainer("Erreur lors de la génération du planning.");
  }
}

/**
 * Version graphique stable et esthétique des jalons (reprend l'interface en larges blocs blancs)
 */
function renderMilestonesBeautifulDesign(container, data) {
  const etapes = [
    { id: "voletA", titre: "Volet A", desc: "Entrée en formation & Objectifs", mois: "Mois 1" },
    { id: "suivi1", titre: "Bilan 1", desc: "Premier point d'étape", mois: "Mois 3" },
    { id: "suivi2", titre: "Bilan 2", desc: "Deuxième point d'étape", mois: "Mois 6" },
    { id: "suivi3", titre: "Bilan 3", desc: "Troisième point d'étape", mois: "Mois 9" },
    { id: "voletC", titre: "Volet C", desc: "Validation finale & Retours", mois: "Mois 12" }
  ];

  let html = `
    <div style="display: flex; flex-direction: column; gap: 16px; position: relative; margin: 20px 0; padding-left: 40px;">
      <div style="position: absolute; left: 16px; top: 20px; bottom: 20px; width: 3px; background: #cbd5e1; z-index: 1;"></div>
  `;

  etapes.forEach((etape) => {
    const etapeData = data[etape.id] || {};
    const estValide = etapeData.valide || etapeData.visaTuteur || false;
    
    // Récupération dynamique de la date de validation si elle est présente dans Firebase
    const dateValidation = etapeData.date || etapeData.dateValidation || etapeData.dateVisa || "";

    const bulleCouleur = estValide ? "#10b981" : "#3b82f6";
    const icone = estValide ? "✅" : "🔵";

    html += `
      <div style="display: flex; align-items: flex-start; position: relative; z-index: 2;">
        <div style="position: absolute; left: -32px; top: 22px; width: 16px; height: 16px; border-radius: 50%; background: ${bulleCouleur}; border: 3px solid #f1f5f9; box-shadow: 0 0 0 2px ${bulleCouleur};"></div>
        
        <div style="background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02); flex-grow: 1; display: flex; justify-content: space-between; align-items: center; gap: 15px;">
          <div>
            <h4 style="margin: 0 0 4px 0; color: #1e293b; font-size: 1.05rem; font-weight: 600; display: flex; align-items: center; gap: 8px;">
              <span>${icone}</span> ${etape.titre}
            </h4>
            <p style="margin: 0; color: #64748b; font-size: 0.9rem;">${etape.desc}</p>
            ${dateValidation ? `<div style="margin-top: 6px; font-size: 0.8rem; color: #059669; font-weight: 500;">📅 Fait le : ${dateValidation}</div>` : ""}
          </div>
          
          <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 4px 12px; border-radius: 20px; white-space: nowrap;">
            ${etape.mois}
          </div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}

/**
 * Va chercher le planning avec double vérification des clés de documents
 */
async function fetchAndRenderPlanning(docSessionId, fallbackRawName) {
  const planningContainer = document.getElementById("planning-modules-container");
  if (!planningContainer) return;

  try {
    // Tentative 1 : Avec l'ID nettoyé (ex: session_26_2)
    let sessionSnap = await getDoc(doc(db, "sessions", docSessionId));
    
    // Tentative 2 de secours : Avec le nom brut s'il contient des caractères spéciaux non nettoyés
    if (!sessionSnap.exists() && fallbackRawName) {
      sessionSnap = await getDoc(doc(db, "sessions", fallbackRawName));
    }
    
    if (!sessionSnap.exists()) {
      planningContainer.innerHTML = `
        <div style="padding: 24px; color: #475569; text-align: center; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; margin: 15px 0; font-size: 0.9rem;">
          ℹ️ Le calendrier importé pour la session <strong>"${docSessionId}"</strong> n'a pas encore été chargé.<br>
          <span style="color:#64748b; font-size:0.8rem;">Allez dans l'onglet <strong>Admin</strong> et glissez-déposez le PDF de la session.</span>
        </div>`;
      return;
    }

    const sessionData = sessionSnap.data();
    const modulesRaw = sessionData.etapes || sessionData.modules || sessionData.formations || sessionData.rows || [];
    
    if (modulesRaw.length === 0) {
      planningContainer.innerHTML = `<div style="padding: 20px; color: #666; text-align: center;">Le document existe mais ne contient aucun cours.</div>`;
      return;
    }

    let htmlModules = "";
    let moisPrecedent = "";

    modulesRaw.forEach((mod) => {
      const codeForm = mod.code || mod["Code RAF"] || mod.codeRaf || "MODULE";
      const titreForm = mod.titre || mod.Formations || mod.formation || "Sans titre";
      const lieuForm = mod.lieu || mod["Lieu Form."] || mod.lieuForm || "Non spécifié";
      const dureeForm = mod.duree || mod["Durée"] || mod.dureeForm || "N/A";
      const dateDebut = mod.debut || mod["date début"] || mod.dateDebut || "";
      const dateFin = mod.fin || mod["date fin"] || mod.dateFin || "";

      let nomMoisAffiche = "Formations de la session";
      if (dateDebut && dateDebut.includes("/")) {
        const parts = dateDebut.split("/");
        if (parts.length === 3) {
          const dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          if (!isNaN(dateObj.getTime())) {
            const nomMoisLong = dateObj.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
            nomMoisAffiche = nomMoisLong.charAt(0).toUpperCase() + nomMoisLong.slice(1);
          }
        }
      }

      if (nomMoisAffiche !== moisPrecedent) {
        htmlModules += `<h3 style="margin: 25px 0 10px 0; color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 1.1rem; font-weight:600;">${nomMoisAffiche}</h3>`;
        moisPrecedent = nomMoisAffiche;
      }

      const badgeStyle = getBadgeColor(titreForm || codeForm);

      htmlModules += `
        <div style="background: white; border-left: 4px solid ${badgeStyle.color}; margin: 12px 0; padding: 16px; border-radius: 0 8px 8px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: block; border-top: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
          <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 10px;">
            <div>
              <span style="font-size: 0.7rem; font-weight: bold; background: ${badgeStyle.bg}; color: ${badgeStyle.color}; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;">${codeForm}</span>
              <h4 style="margin: 8px 0 4px 0; color: #1e293b; font-size: 1rem; font-weight:600;">${titreForm}</h4>
              <p style="margin: 0; color: #64748b; font-size: 0.85rem;">📍 Lieu : <strong>${lieuForm}</strong> | ⏳ Durée : ${dureeForm}</p>
            </div>
            <div style="text-align: right; font-size: 0.85rem; font-weight: bold; color: #475569; background: #f8fafc; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; line-height:1.4;">
              Du ${dateDebut || "?"}<br>au ${dateFin || "?"}
            </div>
          </div>
        </div>
      `;
    });

    planningContainer.innerHTML = htmlModules;

  } catch (error) {
    console.error("Erreur lors du rendu du planning :", error);
    planningContainer.innerHTML = `<div style="color:red; padding:20px; text-align:center;">⚠️ Échec du chargement des modules.</div>`;
  }
}

function getBadgeColor(typeStr) {
  const t = typeStr.toLowerCase();
  if (t.includes("stage") || t.includes("terrain") || t.includes("etude")) {
    return { color: "#df8b14", bg: "#fef3c7" };
  } else if (t.includes("bilan") || t.includes("entretiens") || t.includes("fil rouge")) {
    return { color: "#dc2626", bg: "#fee2e2" };
  } else if (t.includes("socle") || t.includes("tronc")) {
    return { color: "#7c3aed", bg: "#f3e8ff" };
  }
  return { color: "#2563eb", bg: "#dbeafe" };
}

function clearPlanningContainer(message) {
  const planningContainer = document.getElementById("planning-modules-container");
  if (planningContainer) {
    planningContainer.innerHTML = `<div style="padding: 30px; color: #94a3b8; text-align: center; font-style: italic;">ℹ️ ${message}</div>`;
  }
}