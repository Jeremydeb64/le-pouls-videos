// Voix ElevenLabs + minutage mot par mot (transcription Scribe) + calage des sous-titres et des scènes.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { noterVoix, noterTranscription } from "./couts.mjs";

const EL = "https://api.elevenlabs.io/v1";
export const VOIX = {
  lucie: process.env.VOIX_LUCIE || "LFtQZWdaqmvamcTNGpwl",
  nicolas: process.env.VOIX_NICOLAS || "aQROLel5sQbj1vuIVi6B",
};
const MODELE_TTS = process.env.ELEVEN_MODEL || "eleven_v3";
// Réglages par présentateur. Nicolas : stabilité « Creative » (plus d'intonation) et ton énergique par défaut.
const REGLAGES = {
  lucie: { stability: 0.5 },
  nicolas: { stability: 0.0 },
};
const TON_PAR_DEFAUT = { nicolas: "[energetic]" };
// Ajoute une balise d'énergie en tête de réplique quand le Scénariste n'en a pas mis
const avecTon = (texte, qui) => (TON_PAR_DEFAUT[qui] && !/^\s*\[/.test(texte) ? `${TON_PAR_DEFAUT[qui]} ${texte}` : texte);
// Rythme : la voix est légèrement accélérée (sans changer la hauteur) avant la transcription
export const VITESSE = { lucie: +(process.env.VITESSE_LUCIE || 1.07), nicolas: +(process.env.VITESSE_NICOLAS || 1.1), duo: +(process.env.VITESSE_DUO || 1.07) };
export function accelerer(fichier, facteur) {
  if (!facteur || Math.abs(facteur - 1) < 0.005) return;
  const tmp = fichier.replace(/\.mp3$/, "-brut.mp3");
  fs.renameSync(fichier, tmp);
  execFileSync("npx", ["remotion", "ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", tmp, "-filter:a", `atempo=${facteur}`, "-ar", "44100", "-b:a", "128k", fichier], { stdio: "inherit" });
  fs.rmSync(tmp);
}

const cle = () => {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error("ELEVENLABS_API_KEY manquante (secret GitHub).");
  return k;
};

export async function genererVoix(texte, presentateur, fichier) {
  const r = await fetch(`${EL}/text-to-speech/${VOIX[presentateur] || VOIX.lucie}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": cle(), "content-type": "application/json" },
    body: JSON.stringify({ text: avecTon(texte, presentateur), model_id: MODELE_TTS, language_code: "fr", voice_settings: REGLAGES[presentateur] || REGLAGES.lucie }),
  });
  if (!r.ok) throw new Error(`ElevenLabs TTS ${r.status} : ${(await r.text()).slice(0, 300)}`);
  noterVoix("voix", r, texte.length);
  fs.writeFileSync(fichier, Buffer.from(await r.arrayBuffer()));
}

// Format à deux voix : [{ qui: "lucie" | "nicolas", texte }] → un seul fichier audio (dialogue ElevenLabs)
export async function genererDialogue(repliques, fichier) {
  const r = await fetch(`${EL}/text-to-dialogue?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": cle(), "content-type": "application/json" },
    body: JSON.stringify({ model_id: "eleven_v3", inputs: repliques.map((x) => ({ text: avecTon(x.texte, x.qui), voice_id: VOIX[x.qui] || VOIX.lucie })) }),
  });
  if (!r.ok) throw new Error(`ElevenLabs dialogue ${r.status} : ${(await r.text()).slice(0, 300)}`);
  noterVoix("dialogue", r, repliques.reduce((n, x) => n + x.texte.length, 0));
  fs.writeFileSync(fichier, Buffer.from(await r.arrayBuffer()));
}

export async function transcrire(fichier) {
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("language_code", "fra");
  form.append("timestamps_granularity", "word");
  form.append("file", new Blob([fs.readFileSync(fichier)], { type: "audio/mpeg" }), "voix.mp3");
  const r = await fetch(`${EL}/speech-to-text`, { method: "POST", headers: { "xi-api-key": cle() }, body: form });
  if (!r.ok) throw new Error(`ElevenLabs STT ${r.status} : ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  noterTranscription(Math.max(0, ...(d.words || []).map((w) => w.end || 0)));
  return d.words.filter((w) => w.type === "word");
}

// Mots prononcés (sans balises [warm], sans ponctuation isolée)
const nettoyer = (mots) => mots.filter((w) => !/^\[.*\]$|^\[|\]$/.test(w.text) && /[\p{L}\p{N}]/u.test(w.text));
const jetons = (texte) => texte.replace(/\[[^\]]*\]/g, " ").split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t));

/**
 * segments : [{ dit: "cent cinquante mille spectateurs.", affiche: "150’000 spectateurs." }]
 * Retourne les sous-titres [début, fin, texte] alignés sur les mots transcrits.
 */
export function alignerSousTitres(segments, motsBruts) {
  const mots = nettoyer(motsBruts);
  const norm = (x) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  // Jetons du texte, avec leur segment d'origine
  const toks = [];
  segments.forEach((seg, k) => jetons(seg.dit).forEach((t) => toks.push({ t: norm(t), k })));
  const W = mots.map((m) => norm(m.text));
  const n = toks.length, m = W.length;
  // Alignement global (plus longue sous-séquence commune) entre texte et transcription
  const L = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) L[i][j] = toks[i].t === W[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const lien = new Array(n).fill(-1);
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (toks[i].t === W[j]) { lien[i] = j; i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  const ecart = n - lien.filter((x) => x >= 0).length;
  // Bornes de chaque segment ; si un segment n'a aucun mot reconnu, il est interpolé entre ses voisins
  const bornes = segments.map((_, k) => {
    const idx = lien.filter((j, i) => j >= 0 && toks[i].k === k);
    return idx.length ? [Math.min(...idx), Math.max(...idx)] : null;
  });
  const out = [];
  segments.forEach((seg, k) => {
    let b = bornes[k];
    if (!b) {
      const avant = bornes.slice(0, k).reverse().find(Boolean);
      const apres = bornes.slice(k + 1).find(Boolean);
      const s0 = avant ? mots[avant[1]].end : 0;
      const s1 = apres ? mots[apres[0]].start : s0 + 1.5;
      out.push([+s0.toFixed(2), +Math.max(s1, s0 + 0.5).toFixed(2), seg.affiche]);
      return;
    }
    out.push([+mots[b[0]].start.toFixed(2), +mots[b[1]].end.toFixed(2), seg.affiche]);
  });
  return { sousTitres: out.filter((x) => jetons(x[2] || "").length || x[2]), ecart };
}

// Résout les ancres { "seg": k } dans les scènes : from/to en secondes, et les « at » relatifs au début de scène.
export function caleScenes(scenes, sousTitres, duree) {
  const t = (k) => sousTitres[Math.max(0, Math.min(k, sousTitres.length - 1))][0];
  const res = scenes.map((s) => ({ ...s, from: typeof s.from === "object" ? +Math.max(0, t(s.from.seg) - 0.1).toFixed(2) : s.from }));
  res[0].from = 0;
  res.forEach((s, i) => (s.to = i < res.length - 1 ? res[i + 1].from : duree));
  const resoudre = (v, debutScene) => {
    if (Array.isArray(v)) return v.map((x) => resoudre(x, debutScene));
    if (v && typeof v === "object") {
      if ("seg" in v && Object.keys(v).length === 1) return +(Math.max(0, t(v.seg) - debutScene)).toFixed(2);
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resoudre(x, debutScene)]));
    }
    return v;
  };
  return res.map((s) => ({ ...s, props: resoudre(s.props, s.from) }));
}
