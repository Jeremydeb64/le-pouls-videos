// Agent 4 — Diffuseur. Lancé UNIQUEMENT après validation humaine (commentaire « OK » sur l'issue de la vidéo).
// Envoie la vidéo en brouillon dans l'appli TikTok (API officielle, gratuite) : publication finale à la main dans TikTok.
import { redaction } from "./lib/redaction.mjs";
import { tiktokActif, envoyerBrouillon } from "./lib/tiktok.mjs";
import fs from "node:fs";

const mp4 = process.env.VIDEO;
const id = process.env.EPISODE_ID;
redaction.agent("diffuseur", "travaille");
redaction.dit("diffuseur", "Feu vert reçu, j'envoie la vidéo dans l'appli TikTok.");
let message;
if (!tiktokActif()) {
  message = "TikTok n'est pas encore connecté : la vidéo et son texte sont prêts dans l'issue, à publier à la main.";
} else {
  try {
    const r = await envoyerBrouillon(mp4);
    message = `📲 Brouillon envoyé dans ton appli TikTok (${r.statut}). Ouvre la notification TikTok, colle le texte de publication, active l'étiquette « Contenu généré par l'IA » et publie. Le brouillon expire si tu ne le termines pas rapidement.`;
  } catch (e) {
    message = `⚠️ Envoi TikTok impossible : ${e.message}. La vidéo reste disponible dans l'issue pour une publication à la main.`;
    process.exitCode = 0;
  }
}
redaction.dit("diffuseur", message);
redaction.agent("diffuseur", "attend");
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/diffusion.txt", message);
await redaction.fin();
console.log(message, id);
