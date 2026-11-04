// Connexion initiale du compte TikTok : échange le code reçu sur la page de retour contre un jeton,
// et l'enregistre dans le secret TIKTOK_REFRESH_TOKEN. Lancé par le workflow « Connexion TikTok ».
import { echangerCode, enregistrerRefresh } from "./lib/tiktok.mjs";
const code = process.env.CODE || "";
if (!code) throw new Error("Code manquant.");
const d = await echangerCode(code);
enregistrerRefresh(d.refresh_token);
console.log(`Compte TikTok connecté (permissions : ${d.scope}). Jeton valable ${Math.round((d.refresh_expires_in || 0) / 86400)} jours, enregistré dans les secrets.`);
if (!/video\.upload/.test(d.scope || "")) console.log("Attention : la permission video.upload n'a pas été accordée.");
