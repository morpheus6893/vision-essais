import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./app.js";

export async function initParcours() {
  console.log("Initialisation de l'onglet Parcours (Frise chronologique)...");
  
  const container = document.getElementById("parcours-timeline-container");
  if (!container) return;

  // 1. Récupération de l'agent sélectionné dans le menu global
  const selectAgent = document.getElementById("global-agent-selector");
  const agentId = selectAgent ? selectAgent.value : null;

  if (!agentId) {
    container.innerHTML = `<div style="text-align:center; padding:30px; color:#666;">⚠️ Veuillez sélectionner un agent dans le menu supérieur.</div>`;
    return;
  }

  try {
    // 2. Chargement des données de l'agent pour connaître son avancement
    const docSnap = await getDoc(doc(db, "agents", agentId));
    
    // Structure par défaut des étapes de la frise (les bulles)
    const etapes = [
      { id: "voletA", titre: "Volet A", desc: "Entrée en formation & Objectifs", mois: "Mois 1" },
      { id: "suivi1", titre: "Bilan 1", desc: "Premier point d'étape", mois: "Mois 3" },
      { id: "suivi2", titre: "Bilan 2", desc: "Deuxième point d'étape", mois: "Mois 6" },
      { id: "suivi3", titre: "Bilan 3", desc: "Troisième point d'étape", mois: "Mois 9" },
      { id: "voletC", titre: "Volet C", desc: "Validation finale & Retours", mois: "Mois 12" }
    ];

    let html = `
      <div style="display: flex; flex-direction: column; gap: 30px; position: relative; margin: 20px 0; padding-left: 30px;">
        <div style="position: absolute; left: 10px; top: 10px; bottom: 10px; width: 4px; background: #cbd5e1; z-index: 1;"></div>
    `;

    if (docSnap.exists()) {
      const data = docSnap.data();
      
      etapes.forEach((etape) => {
        // Détermination du statut de l'étape pour la couleur de la bulle
        // (Vérifie si le tuteur ou l'agent a validé l'étape dans la base)
        const estValide = data[etape.id]?.valide || data[etape.id]?.visaTuteur || false;
        
        const bulleCouleur = estValide ? "#10b981" : "#3b82f6"; // Vert si validé, Bleu si en cours/à faire
        const icone = estValide ? "✅" : "🔵";

        html += `
          <div style="display: flex; align-items: flex-start; gap: 20px; position: relative; z-index: 2;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${bulleCouleur}; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-left: -25px;">
              ${estValide ? "✓" : "•"}
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); flex-grow: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <h4 style="margin: 0; color: #1e293b; font-size: 1rem;">${icone} ${etape.titre}</h4>
                <span style="font-size: 0.8rem; font-weight: bold; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 12px;">${etape.mois}</span>
              </div>
              <p style="margin: 0; color: #475569; font-size: 0.85rem;">${etape.desc}</p>
            </div>
          </div>
        `;
      });

    } else {
      html += `<p>Aucune donnée d'avancement pour cet agent.</p>`;
    }

    html += `</div>`;
    container.innerHTML = html;

  } catch (err) {
    console.error("Erreur parcours :", err);
    container.innerHTML = `<div style="color:red;">Erreur lors du chargement de la synthèse du parcours.</div>`;
  }
}