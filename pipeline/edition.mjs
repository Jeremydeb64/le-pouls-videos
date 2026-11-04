// Édition du Pouls : Veilleur → Scénariste → voix → rendu → Contrôleur (→ corrections) → demande de validation.
// Lancé par GitHub Actions (matin et soir) ou à la main : EDITION=matin node pipeline/edition.mjs
import fs from "node:fs";
import path from "node:path";
import { demander, json, consigne, MODELE_LEGER } from "./lib/claude.mjs";
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
  const rep = await demander({
    systeme: consigne("veilleur"),
    modele: MODELE_LEGER,
    contenu: `Nous sommes le ${AUJ}. Édition : ${EDITION}. Nombre de sujets à retenir : ${MAX_SUJETS}.\n\nSujets déjà traités (14 derniers jours) :\n${JSON.stringify(histo.slice(-40).map((h) => h.titre))}\n\nArticles :\n${JSON.stringify(articles.slice(0, 150))}`,
  });
  const choix = json(rep);
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
  const rep = await demander({
    systeme: consigne("scenariste") + "\n\n---\n\n" + SCHEMA,
    recherche: true,
    max: 32000,
    contenu:
      `Date : ${AUJ}. Publication prévue : ${PUBLICATION}.\n\nSujet :\n${JSON.stringify(sujet)}\n\nTexte de l'article principal :\n${texte}\n\n` +
      (retours ? `CORRECTIONS DEMANDÉES PAR LE CONTRÔLE (version précédente ci-dessous) :\n${JSON.stringify(retours)}\n\n` : "") +
      "Réponds UNIQUEMENT par un seul bloc ```json``` au format « Sortie technique » de ta consigne, sans aucun texte avant ou après. Fais tes recherches, puis écris directement le JSON.",
  });
  return json(rep);
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
async function controler(episode, script, dossier) {
  redaction.agent("controleur", "travaille");
  redaction.dit("controleur", "Je relis les faits et je regarde les images clés.");
  const images = await imagesCles(episode, path.join(dossier, "cles"));
  const contenu = [
    { type: "text", text: `Date : ${AUJ}. Publication prévue : ${PUBLICATION}.\nÉpisode :\n${JSON.stringify(episode)}\n\nTexte de la voix :\n${script.voix}\n\nFaits et sources :\n${JSON.stringify(script.faits)}` },
    ...images.map((f) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: fs.readFileSync(f).toString("base64") } })),
  ];
  const verdict = json(await demander({ systeme: consigne("controleur"), contenu, recherche: true }));
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
const sujets = await veille();
const prets = [];
for (const sujet of sujets) {
 try {
  const dossier = path.resolve("out", slug(sujet.titre_travail));
  fs.mkdirSync(dossier, { recursive: true });
  let script = await ecrire(sujet);
  let resultat, verdict;
  for (let tour = 0; tour < 3; tour++) {
    resultat = await produire(script, dossier);
    verdict = await controler(resultat.episode, script, dossier);
    if (verdict.decision !== "A_CORRIGER" || tour === 2) break;
    script = await ecrire(sujet, { version_precedente: script, problemes: verdict.problemes });
  }
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
