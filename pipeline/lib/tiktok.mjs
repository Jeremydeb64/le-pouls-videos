// TikTok Content Posting API, mode « brouillon » : la vidéo arrive dans la boîte de réception de l'appli TikTok,
// le titulaire du compte la termine et la publie lui-même. Pas d'audit nécessaire, aucun outil payant.
// Secrets : TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REFRESH_TOKEN (+ GH_PAT pour enregistrer le jeton renouvelé).
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const API = "https://open.tiktokapis.com/v2";
export const REDIRECT = "https://jeremydeb64.github.io/le-pouls-videos/tiktok/callback.html";
export const tiktokActif = () => !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_REFRESH_TOKEN);
const masquer = (v) => v && process.env.GITHUB_ACTIONS && console.log(`::add-mask::${v}`);

async function jeton(params) {
  const r = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "cache-control": "no-cache" },
    body: new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY.trim(), client_secret: process.env.TIKTOK_CLIENT_SECRET.trim(), ...params }),
  });
  const d = await r.json();
  if (!r.ok || d.error || !d.access_token) throw new Error(`TikTok OAuth : ${d.error || r.status} ${d.error_description || ""}`);
  masquer(d.access_token);
  masquer(d.refresh_token);
  return d;
}

// Enregistre le jeton de renouvellement dans les secrets GitHub (nécessite GH_PAT avec droit « Secrets : écriture »)
export function enregistrerRefresh(refresh) {
  if (!process.env.GH_PAT) throw new Error("GH_PAT manquant : impossible d'enregistrer le jeton TikTok dans les secrets.");
  execFileSync("gh", ["secret", "set", "TIKTOK_REFRESH_TOKEN", "--repo", process.env.GITHUB_REPOSITORY || "Jeremydeb64/le-pouls-videos", "--body", refresh], {
    env: { ...process.env, GH_TOKEN: process.env.GH_PAT },
    stdio: ["ignore", "ignore", "inherit"],
  });
}

export const echangerCode = (code) => jeton({ code: decodeURIComponent(code.trim()), grant_type: "authorization_code", redirect_uri: REDIRECT });

export async function accesFrais() {
  const d = await jeton({ grant_type: "refresh_token", refresh_token: process.env.TIKTOK_REFRESH_TOKEN.trim() });
  if (d.refresh_token && d.refresh_token !== process.env.TIKTOK_REFRESH_TOKEN.trim()) {
    try {
      enregistrerRefresh(d.refresh_token);
    } catch (e) {
      console.warn("Jeton TikTok renouvelé mais non enregistré :", e.message);
    }
  }
  return d.access_token;
}

// Dépose la vidéo dans la boîte de réception TikTok (brouillon), puis attend la confirmation
export async function envoyerBrouillon(mp4) {
  const access = await accesFrais();
  const taille = fs.statSync(mp4).size;
  // Morceaux : un seul jusqu'à 64 Mo, sinon morceaux de 10 Mo (le dernier absorbe le reste)
  const morceau = taille <= 64 * 1024 * 1024 ? taille : 10 * 1024 * 1024;
  const nb = Math.max(1, Math.floor(taille / morceau));
  const h = { Authorization: `Bearer ${access}`, "content-type": "application/json; charset=UTF-8" };
  const init = await fetch(`${API}/post/publish/inbox/video/init/`, { method: "POST", headers: h, body: JSON.stringify({ source_info: { source: "FILE_UPLOAD", video_size: taille, chunk_size: morceau, total_chunk_count: nb } }) });
  const di = await init.json();
  if (!init.ok || di.error?.code !== "ok") throw new Error(`TikTok init : ${di.error?.code} ${di.error?.message || init.status}`);
  const { publish_id, upload_url } = di.data;
  const fd = fs.openSync(mp4, "r");
  for (let i = 0; i < nb; i++) {
    const debut = i * morceau;
    const fin = i === nb - 1 ? taille - 1 : debut + morceau - 1;
    const buf = Buffer.alloc(fin - debut + 1);
    fs.readSync(fd, buf, 0, buf.length, debut);
    const r = await fetch(upload_url, { method: "PUT", headers: { "content-type": "video/mp4", "content-length": String(buf.length), "content-range": `bytes ${debut}-${fin}/${taille}` }, body: buf });
    if (!r.ok && r.status !== 206) throw new Error(`TikTok envoi du morceau ${i + 1}/${nb} : ${r.status} ${(await r.text()).slice(0, 200)}`);
  }
  fs.closeSync(fd);
  for (let i = 0; i < 40; i++) {
    await new Promise((ok) => setTimeout(ok, 5000));
    const s = await fetch(`${API}/post/publish/status/fetch/`, { method: "POST", headers: h, body: JSON.stringify({ publish_id }) });
    const ds = await s.json();
    const st = ds.data?.status;
    if (st === "SEND_TO_USER_INBOX" || st === "PUBLISH_COMPLETE") return { publish_id, statut: st };
    if (st === "FAILED") throw new Error(`TikTok : échec du traitement (${ds.data?.fail_reason || "raison inconnue"})`);
  }
  return { publish_id, statut: "en cours de traitement" };
}
