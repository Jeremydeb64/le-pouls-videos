// Met à jour les soldes (ElevenLabs, Anthropic) sans lancer d'édition : node pipeline/budget.mjs
import { enregistrer } from "./lib/couts.mjs";
const { journal } = await enregistrer("relevé des soldes");
console.log(JSON.stringify(journal.soldes, null, 1));
const mois = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Zurich" }).slice(0, 7);
console.log("Ce mois :", journal.par_mois?.[mois] || "aucune dépense notée");
