// Visuels générés par IA via l'API Higgsfield (image, puis animation courte à partir de l'image).
// Secret : HIGGSFIELD_KEY (format « id:secret », en-tête « Authorization: Key … »).
import fs from "node:fs";
import { noter, tarifs } from "./couts.mjs";

const B = "https://platform.higgsfield.ai";
export const MODELE_IMAGE = process.env.HF_MODELE_IMAGE || "alibaba/qwen-image-3/text-to-image";
export const MODELE_VIDEO = process.env.HF_MODELE_VIDEO || "kling-video/v4.0-flash/image-to-video";
export const higgsfieldActif = () => !!(process.env.HIGGSFIELD_KEY || "").trim();
const H = () => ({ Authorization: `Key ${(process.env.HIGGSFIELD_KEY || "").trim()}`, accept: "application/json", "content-type": "application/json" });

// Envoi tolérant : si un champ facultatif est refusé (400/422), on le retire et on réessaie
async function soumettre(modele, corps) {
  const c = { ...corps };
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${B}/${modele}`, { method: "POST", headers: H(), body: JSON.stringify(c) });
    const t = await r.text();
    if (r.ok) return JSON.parse(t);
    if (r.status === 403 && /credit/i.test(t)) throw new Error("Higgsfield : solde API insuffisant (recharger sur console.higgsfield.ai)");
    const champ = Object.keys(c).find((k) => k !== "prompt" && k !== "image_url" && t.includes(k));
    if ((r.status === 400 || r.status === 422) && champ) {
      delete c[champ];
      continue;
    }
    throw new Error(`Higgsfield ${modele} ${r.status} : ${t.slice(0, 200)}`);
  }
  throw new Error(`Higgsfield ${modele} : paramètres refusés`);
}

async function attendre(d, maxSec = 420) {
  const url = d.status_url || `${B}/requests/${d.request_id}/status`;
  const debut = Date.now();
  while (Date.now() - debut < maxSec * 1000) {
    await new Promise((r) => setTimeout(r, 5000));
    const r = await fetch(url, { headers: H() });
    if (!r.ok) continue;
    const j = await r.json();
    if (j.status === "completed") return j;
    if (/failed|nsfw|canceled/.test(j.status)) throw new Error(`Higgsfield : génération ${j.status}`);
  }
  throw new Error("Higgsfield : délai dépassé");
}

// Premier lien média trouvé dans la réponse (images[].url, video.url, etc.)
const lienMedia = (j, video) => {
  const tous = JSON.stringify(j).match(/https?:\/\/[^"\\]+/g) || [];
  const re = video ? /\.(mp4|mov|webm)(\?|$)/i : /\.(png|jpe?g|webp)(\?|$)/i;
  return tous.find((u) => re.test(u)) || (video ? null : tous.find((u) => !/status|cancel|requests/.test(u)));
};

async function telecharger(url, fichier) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`téléchargement ${r.status}`);
  fs.writeFileSync(fichier, Buffer.from(await r.arrayBuffer()));
}

// Image 9:16, puis (si demandé) animation de 5 s à partir de cette image
export async function visuelIA({ prompt, animation = false }, base) {
  const p = `${prompt}. Vertical 9:16 composition, no text, no letters, no logos, no watermark.`;
  const img = await attendre(await soumettre(MODELE_IMAGE, { prompt: p, aspect_ratio: "9:16", resolution: "2k" }));
  const urlImg = lienMedia(img, false);
  if (!urlImg) throw new Error("Higgsfield : image introuvable dans la réponse");
  noter("higgsfield", "image", 1, "image", tarifs.higgsfield?.image_usd || 0);
  const fImg = `${base}.jpg`;
  await telecharger(urlImg, fImg);
  if (!animation) return { fichier: fImg, video: false };
  try {
    const vid = await attendre(await soumettre(MODELE_VIDEO, { prompt: `${prompt}. Slow, gentle, continuous motion, static camera, seamless.`, image_url: urlImg, duration: 5, resolution: "720p", aspect_ratio: "9:16" }), 600);
    const urlVid = lienMedia(vid, true);
    if (!urlVid) throw new Error("vidéo introuvable dans la réponse");
    noter("higgsfield", "animation", 5, "secondes", 5 * (tarifs.higgsfield?.video_usd_par_seconde || 0));
    const fVid = `${base}.mp4`;
    await telecharger(urlVid, fVid);
    return { fichier: fVid, video: true, duree: 5 };
  } catch (e) {
    console.warn("Animation IA abandonnée, image fixe gardée :", e.message);
    return { fichier: fImg, video: false };
  }
}
