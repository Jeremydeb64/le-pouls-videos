// Voix ElevenLabs + minutage mot par mot (transcription Scribe) + calage des sous-titres et des scènes.
import fs from "node:fs";

const EL = "https://api.elevenlabs.io/v1";
export const VOIX = {
  lucie: process.env.VOIX_LUCIE || "LFtQZWdaqmvamcTNGpwl",
  nicolas: process.env.VOIX_NICOLAS || "aQROLel5sQbj1vuIVi6B",
};
const MODELE_TTS = process.env.ELEVEN_MODEL || "eleven_v3";

const cle = () => {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error("ELEVENLABS_API_KEY manquante (secret GitHub).");
  return k;
};

export async function genererVoix(texte, presentateur, fichier) {
  const r = await fetch(`${EL}/text-to-speech/${VOIX[presentateur] || VOIX.lucie}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": cle(), "content-type": "application/json" },
    body: JSON.stringify({ text: texte, model_id: MODELE_TTS, language_code: "fr" }),
  });
  if (!r.ok) throw new Error(`ElevenLabs TTS ${r.status} : ${(await r.text()).slice(0, 300)}`);
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
  const out = [];
  let i = 0;
  for (const seg of segments) {
    const n = jetons(seg.dit).length;
    if (n === 0) continue;
    const debut = mots[Math.min(i, mots.length - 1)];
    const fin = mots[Math.min(i + n - 1, mots.length - 1)];
    out.push([+debut.start.toFixed(2), +fin.end.toFixed(2), seg.affiche]);
    i += n;
  }
  const ecart = Math.abs(i - mots.length);
  return { sousTitres: out, ecart }; // un écart > 3 mots signale un texte qui ne correspond pas à la voix
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
