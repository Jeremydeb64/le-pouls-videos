// Agent 4 — Diffuseur. Lancé UNIQUEMENT après validation humaine (commentaire « OK » sur l'issue de l'édition).
// Publication via Postiz (TikTok). Tant que POSTIZ_API_KEY n'est pas configurée, la vidéo reste prête à publier à la main.
import fs from "node:fs";
import { redaction } from "./lib/redaction.mjs";

const mp4 = process.env.VIDEO;
const description = fs.readFileSync(process.env.DESCRIPTION_FILE, "utf8");
const id = process.env.EPISODE_ID;

redaction.agent("diffuseur", "travaille");
redaction.dit("diffuseur", "Feu vert reçu, je prépare la publication.");

const KEY = process.env.POSTIZ_API_KEY;
const BASE = process.env.POSTIZ_URL || "https://api.postiz.com/public/v1";
const INTEGRATION = process.env.POSTIZ_TIKTOK_ID;

if (!KEY || !INTEGRATION) {
  redaction.dit("diffuseur", "Postiz n'est pas encore branché : la vidéo et sa description sont prêtes dans l'issue, à publier à la main.");
  redaction.agent("diffuseur", "attend");
  process.exit(0);
}

// 1. Envoi du fichier
const form = new FormData();
form.append("file", new Blob([fs.readFileSync(mp4)], { type: "video/mp4" }), `${id}.mp4`);
const up = await fetch(`${BASE}/upload`, { method: "POST", headers: { Authorization: KEY }, body: form });
if (!up.ok) throw new Error(`Postiz upload ${up.status} : ${await up.text()}`);
const media = await up.json();

// 2. Publication immédiate (le créneau est géré par l'heure de validation / le planificateur)
const post = await fetch(`${BASE}/posts`, {
  method: "POST",
  headers: { Authorization: KEY, "content-type": "application/json" },
  body: JSON.stringify({
    type: "now",
    shortLink: false,
    date: new Date().toISOString(),
    tags: [],
    posts: [{ integration: { id: INTEGRATION }, value: [{ content: description, image: [{ id: media.id, path: media.path }] }], settings: { privacy_level: "PUBLIC_TO_EVERYONE", duet: true, stitch: true, comment: true, autoAddMusic: "no", brand_content_toggle: false, brand_organic_toggle: false, content_posting_method: "DIRECT_POST", is_aigc: true } }],
  }),
});
if (!post.ok) throw new Error(`Postiz post ${post.status} : ${await post.text()}`);
redaction.dit("diffuseur", `Publiée sur TikTok (${new Date().toLocaleTimeString("fr-CH", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit" })}). On regarde la rétention demain.`);
redaction.agent("diffuseur", "termine");
redaction.episode({ id, etat: "publie", publie_le: new Date().toISOString() });
