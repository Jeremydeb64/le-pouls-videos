// Édition du Pouls : Veilleur → Scénariste → voix → rendu → Contrôleur (→ corrections) → demande de validation.
// Lancé par GitHub Actions (matin et soir) ou à la main : EDITION=matin node pipeline/edition.mjs
import fs from "node:fs";
import path from "node:path";
import { demanderJSON, consigne, MODELE_LEGER } from "./lib/claude.mjs";
import { lire, rss, texteArticle, photoLibre } from "./lib/web.mjs";
import { genererVoix, transcrire, alignerSousTitres, caleScenes } from "./lib/voix.mjs";
import { rendre, imagesCles } from "./lib/rendu.mjs";
import { redaction } from "./lib/redaction.mjs";

const EDITION = process.env.EDITION || (new Date().getUTCHours() < 11 ? "matin" : "soir");
const MAX_SUJETS = +(process.env.MAX_SUJETS || 1);
const AUJ = new Date().toLocaleDateString("fr-CH", { timeZone: "Europe/Zurich", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const PUBLICATION = EDITION === "matin" ? "aujourd'hui vers 7 h 30" : "aujourd'hui vers 18 h 30";
const HISTO = "state/historique.json";
const histo = fs.existsSync(HISTO) ? JSON.parse(fs.readFileSync(HISTO, "utf8")) : [];
const SCHEMA = fs.readFileSync("docs/episode-schema.md", "utf8");
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

// ---------- 1. Veilleur ----------
async function veille() {
  redaction.debut(EDITION);
  redaction.dit("veilleur", `Édition du ${EDITION}, je fais le tour des sources.`);
  const cfg = JSON.parse(fs.readFileSync("config/sources.json", "utf8"));
  const articles = [];
  for (const f of cfg.flux) {
    try {
      articles.push(...(await rss(f.url)).slice(0, 25).map((a) => ({ ...a, media: f.media })));
    } catch (e) {
      console.warn("Flux ignoré :", f.url, e.message);
    }
  }
  if (cfg.veille_json) {
    try {
      articles.push(...JSON.parse(await lire(cfg.veille_json)).articles ?? []);
    } catch (e) {
      console.warn("Veille Le Pouls ignorée :", e.message);
    }
  }
  if (!articles.length) throw new Error("Aucun article récupéré : vérifier config/sources.json");
  redaction.dit("veilleur", `${articles.length} articles lus, je regroupe par sujet.`);
  const choix = await demanderJSON({
    systeme: consigne("veilleur"),
    modele: MODELE_LEGER,
    contenu: `Nous sommes le ${AUJ}. Édition : ${EDITION}. Nombre de sujets à retenir : ${MAX_SUJETS}.\n\nSujets déjà traités (14 derniers jours) :\n${JSON.stringify(histo.slice(-40).map((h) => h.titre))}\n\nArticles :\n${JSON.stringify(articles.slice(0, 150))}`,
  });
  for (const s of choix.sujets) redaction.dit("veilleur", `Je garde « ${s.titre_travail} ». ${s.pourquoi || ""}`);
  redaction.agent("veilleur", "termine");
  return choix.sujets.slice(0, MAX_SUJETS);
}

// ---------- 2. Scénariste ----------
async function ecrire(sujet, retours = null) {
  redaction.agent("scenariste", "travaille");
  redaction.dit("scenariste", retours ? "Je reprends le script avec les corrections du contrôle." : `Je lis l'article du ${sujet.source_principale.media}.`);
  let texte = "";
  try {
    texte = texteArticle(await lire(sujet.source_principale.url));
  } catch (e) {
    redaction.dit("scenariste", "Article illisible, je travaille avec les autres sources.");
  }
  return demanderJSON({
    systeme: consigne("scenariste") + "\n\n---\n\n" + SCHEMA,
    recherche: true,
    max: 32000,
    contenu:
      `Date : ${AUJ}. Publication prévue : ${PUBLICATION}.\n\nSujet :\n${JSON.stringify(sujet)}\n\nTexte de l'article principal :\n${texte}\n\n` +
      (retours ? `CORRECTIONS DEMANDÉES PAR LE CONTRÔLE (version précédente ci-dessous) :\n${JSON.stringify(retours)}\n\n` : "") +
      "Réponds UNIQUEMENT par un seul bloc ```json``` au format « Sortie technique » de ta consigne, sans aucun texte avant ou après. Fais tes recherches, puis écris directement le JSON.",
  });
}

// ---------- 3. Voix + calage + photos ----------
async function produire(script, dossier) {
  const id = `${new Date().toISOString().slice(0, 10)}-${EDITION}-${slug(script.titre || "sujet")}`;
  const voixFichier = `voix-${id}.mp3`;
  redaction.dit("scenariste", `J'envoie le texte à ${script.presentateur === "nicolas" ? "Nicolas" : "Lucie"}.`);
  await genererVoix(script.voix, script.presentateur, path.join("public", voixFichier));
  const mots = await transcrire(path.join("public", voixFichier));
  const { sousTitres, ecart } = alignerSousTitres(script.segments, mots);
  if (ecart > 3) redaction.dit("scenariste", `Attention, ${ecart} mots d'écart entre le texte et la voix.`);
  const duree = +(mots[mots.length - 1].end + 1.8).toFixed(2);
  const CONNUS = ["chrono", "titleBib", "calendar", "stats", "crowd", "statement", "bigFigure", "finish", "person", "recap", "photo", "outro", "ballot", "versus", "carte", "frise", "barres", "avantApres"];
  for (const sc of script.scenes) {
    if (!CONNUS.includes(sc.type)) {
      redaction.dit("scenariste", `Pas de modèle « ${sc.type} » : je mets un plein écran texte à la place (demande notée).`);
      const p = sc.props || {};
      sc.props = { text: p.title || p.titre || p.question || p.text || p.kicker || "" };
      sc.type = "statement";
    }
  }
  let scenes = caleScenes(script.scenes, sousTitres, duree);

  // Photos libres demandées par le Scénariste : { type: "photo", props: { recherche: "..." } }
  for (const s of scenes.filter((x) => x.type === "photo")) {
    const f = path.join("public", `photo-${id}-${scenes.indexOf(s)}.jpg`);
    let p = null;
    try {
      p = await photoLibre(s.props.recherche, f);
    } catch (e) {
      console.warn("Photo :", e.message);
    }
    if (p) {
      s.props = { ...s.props, src: path.basename(f), credit: p.credit };
      redaction.dit("scenariste", `Photo trouvée sur Wikimedia : ${p.credit}.`);
    } else {
      s.type = "statement";
      s.props = { text: s.props.title || s.props.kicker || "" };
      redaction.dit("scenariste", "Pas de photo libre convenable, je la remplace par un plein écran texte.");
    }
  }
  const episode = { id, voice: voixFichier, duration: duree, captions: sousTitres, scenes, meta: { presentateur: script.presentateur, sources: script.sources, faits: script.faits, sensible: script.sensible } };
  fs.mkdirSync("episodes", { recursive: true });
  fs.writeFileSync(`episodes/${id}.json`, JSON.stringify(episode, null, 1));
  redaction.agent("scenariste", "termine");
  redaction.dit("scenariste", "Montage lancé.");
  const mp4 = await rendre(episode, path.join(dossier, `${id}.mp4`));
  return { episode, mp4 };
}

// ---------- 4. Contrôleur ----------
// Phase « texte » : faits, neutralité, droits, sur le script (avant voix et montage, peu coûteux).
async function controlerTexte(script) {
  redaction.agent("controleur", "travaille");
  redaction.dit("controleur", "Je relis le script et je vérifie les faits.");
  const verdict = await demanderJSON({
    systeme: consigne("controleur") + "\n\nPHASE TEXTE : tu n'as pas encore les images. Contrôle uniquement les points 1 (faits), 2 (neutralité et sensibilité), 3 (droits) et la cohérence des scènes avec le texte. Réponds UNIQUEMENT par le bloc ```json``` du verdict.",
    contenu: `Date : ${AUJ}. Publication prévue : ${PUBLICATION}.\nScript complet :\n${JSON.stringify(script)}`,
    recherche: true,
  });
  redaction.dit("controleur", verdict.message_redaction || verdict.decision);
  return verdict;
}

// Phase « visuel » : charte, lisibilité, zones TikTok, sur les images clés de la vidéo montée.
async function controlerVisuel(episode, dossier) {
  redaction.dit("controleur", "Je regarde les images clés de la vidéo.");
  const images = await imagesCles(episode, path.join(dossier, "cles"));
  const contenu = [
    { type: "text", text: `PHASE VISUEL. Les faits ont déjà été validés. Contrôle uniquement la charte (point 4) et le son (point 5, d'après les sous-titres et la durée).\nÉpisode :\n${JSON.stringify({ duration: episode.duration, scenes: episode.scenes, captions: episode.captions.length })}` },
    ...images.map((f) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: fs.readFileSync(f).toString("base64") } })),
  ];
  const verdict = await demanderJSON({ systeme: consigne("controleur") + "\n\nRéponds UNIQUEMENT par le bloc ```json``` du verdict. Tout texte qui déborde, se chevauche ou sort de l'écran est BLOQUANT.", contenu });
  redaction.dit("controleur", verdict.message_redaction || verdict.decision);
  redaction.agent("controleur", verdict.decision === "BLOQUE" ? "bloque" : "termine");
  return verdict;
}

// ---------- Orchestration ----------
process.on("unhandledRejection", (e) => {
  redaction.dit("systeme", `Erreur : ${String(e?.stack || e).slice(0, 900)}`);
  redaction.agent("scenariste", "bloque");
  process.exit(1);
});
// Vérification de la clé ElevenLabs avant de lancer les agents (évite de payer des scripts qui ne seront jamais montés)
{
  const k = process.env.ELEVENLABS_API_KEY || "";
  const r = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": k } });
  const d = await r.json().catch(() => ({}));
  const statut = d?.detail?.status || d?.detail?.code || "";
  if (!k.startsWith("sk_") || /invalid_api_key|api_key_id_used/.test(statut)) {
    redaction.dit("systeme", `Clé ElevenLabs refusée (${r.status} ${statut}). Elle doit commencer par « sk_ ».`);
    await redaction.fin();
    process.exit(1);
  }
  if (r.ok) redaction.dit("systeme", `Clé ElevenLabs OK, ${d.character_limit - d.character_count} crédits restants ce mois-ci.`);
  else redaction.dit("systeme", "Clé ElevenLabs reconnue (accès limité à la voix, crédits non lisibles).");
}
const sujets = await veille();
const prets = [];
for (const sujet of sujets) {
 try {
  const dossier = path.resolve("out", slug(sujet.titre_travail));
  fs.mkdirSync(dossier, { recursive: true });
  let script = await ecrire(sujet);
  let verdictTexte = await controlerTexte(script);
  for (let tour = 0; tour < 2 && verdictTexte.decision === "A_CORRIGER"; tour++) {
    script = await ecrire(sujet, { version_precedente: script, problemes: verdictTexte.problemes });
    verdictTexte = await controlerTexte(script);
  }
  if (verdictTexte.decision !== "OK") {
    redaction.dit("controleur", "Je bloque ce sujet, il ne part pas au montage.");
    redaction.episode({ id: `${new Date().toISOString().slice(0, 10)}-${EDITION}-${slug(sujet.titre_travail)}`, titre: sujet.titre_travail, etat: "bloque", problemes: verdictTexte.problemes });
    continue;
  }
  const resultat = await produire(script, dossier);
  const verdictVisuel = await controlerVisuel(resultat.episode, dossier);
  const verdict = {
    decision: verdictVisuel.decision === "BLOQUE" ? "BLOQUE" : "OK",
    problemes: [...(verdictTexte.problemes || []), ...(verdictVisuel.problemes || [])],
  };
  const info = {
    id: resultat.episode.id,
    titre: script.titre,
    edition: EDITION,
    decision: verdict.decision,
    problemes: verdict.problemes,
    description_tiktok: script.description_tiktok,
    sources: script.sources,
    mp4: path.relative(process.cwd(), resultat.mp4),
    etat: verdict.decision === "OK" ? "a_valider" : "bloque",
  };
  redaction.episode(info);
  histo.push({ titre: sujet.titre_travail, date: new Date().toISOString(), id: info.id });
  prets.push(info);
 } catch (e) {
  redaction.dit("systeme", `Sujet « ${sujet.titre_travail} » abandonné : ${String(e?.stack || e).slice(0, 900)}`);
 }
}
fs.writeFileSync(HISTO, JSON.stringify(histo.slice(-200), null, 1));
fs.writeFileSync("out/edition.json", JSON.stringify(prets, null, 1));
redaction.agent("diffuseur", "attend");
redaction.dit("diffuseur", prets.some((p) => p.etat === "a_valider") ? "Vidéo prête, j'attends le feu vert de Jérémy." : "Rien à publier pour cette édition.");
await redaction.fin();
