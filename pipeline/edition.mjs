// Édition du Pouls : Veilleur → Scénariste → voix → rendu → Contrôleur (→ corrections) → demande de validation.
// Lancé par GitHub Actions (matin et soir) ou à la main : EDITION=matin node pipeline/edition.mjs
import fs from "node:fs";
import path from "node:path";
import { demanderJSON, consigne, MODELE_LEGER } from "./lib/claude.mjs";
import { lire, rss, texteArticle, photoLibre } from "./lib/web.mjs";
import { genererVoix, genererDialogue, transcrire, alignerSousTitres, caleScenes, accelerer, VITESSE } from "./lib/voix.mjs";
import { rendre, imagesCles } from "./lib/rendu.mjs";
import { redaction } from "./lib/redaction.mjs";
import { definirContexte, enregistrer, coutDe } from "./lib/couts.mjs";
import { visuelIA, higgsfieldActif } from "./lib/higgsfield.mjs";

const EDITION = process.env.EDITION || (new Date().getUTCHours() < 11 ? "matin" : "soir");
const MAX_SUJETS = +(process.env.MAX_SUJETS || 1);
const AUJ = new Date().toLocaleDateString("fr-CH", { timeZone: "Europe/Zurich", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const PUBLICATION = EDITION === "matin" ? "aujourd'hui vers 7 h 30" : EDITION === "jour" ? "aujourd'hui en fin d'après-midi (vers 17 h 30)" : "aujourd'hui vers 18 h 30";
const HISTO = "state/historique.json";
const histo = fs.existsSync(HISTO) ? JSON.parse(fs.readFileSync(HISTO, "utf8")) : [];
const SCHEMA = fs.readFileSync("docs/episode-schema.md", "utf8");
// Édition automatique (tâche planifiée GitHub ou déclencheur Google à 14 h) : une seule vidéo par jour
if (process.env.CRON || EDITION === "jour") {
  const jour = new Date().toLocaleDateString("fr-CH", { timeZone: "Europe/Zurich" });
  const faites = histo.filter((h) => new Date(h.date).toLocaleDateString("fr-CH", { timeZone: "Europe/Zurich" }) === jour).length;
  if (faites >= 3 || histo.some((h) => h.id?.includes("-jour-") && new Date(h.date).toLocaleDateString("fr-CH", { timeZone: "Europe/Zurich" }) === jour)) {
    console.log(`Déjà ${faites} vidéos aujourd'hui : édition automatique ignorée.`);
    process.exit(0);
  }
  const dejaFaite = histo.some((h) => h.id?.includes(`-${EDITION}-`) && new Date(h.date).toLocaleDateString("fr-CH", { timeZone: "Europe/Zurich" }) === jour);
  if (dejaFaite) {
    console.log(`L'édition du ${EDITION} a déjà été faite aujourd'hui : essai ignoré.`);
    process.exit(0);
  }
}
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

// ---------- 1. Veilleur ----------
async function veille() {
  redaction.debut(EDITION);
  redaction.dit("veilleur", `Édition du ${EDITION}, je fais le tour des sources.`);
  const cfg = JSON.parse(fs.readFileSync("config/sources.json", "utf8"));
  const articles = [];
  for (const f of cfg.flux) {
    try {
      articles.push(...(await rss(f.url)).slice(0, 20).map((a) => ({ ...a, media: f.media })));
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
    contenu: `Nous sommes le ${AUJ}. Édition : ${EDITION}. Nombre de sujets à retenir : ${MAX_SUJETS}.\n\nSujets déjà traités (14 derniers jours) :\n${JSON.stringify(histo.slice(-40).map((h) => h.titre))}\n\nArticles :\n${JSON.stringify(articles.slice(0, 220))}`,
  });
  for (const s of choix.sujets) redaction.dit("veilleur", `Je garde « ${s.titre_travail} ». ${s.pourquoi || ""}`);
  fs.mkdirSync("out", { recursive: true });
  fs.writeFileSync("out/veille.json", JSON.stringify(choix, null, 1));
  console.log("VEILLE", JSON.stringify(choix));
  redaction.agent("veilleur", "termine");
  return choix.sujets.slice(0, MAX_SUJETS);
}

// ---------- 2. Scénariste ----------
async function ecrire(sujet, retours = null) {
  redaction.agent("scenariste", "travaille");
  redaction.dit("scenariste", retours ? "Je reprends le script avec les corrections du contrôle." : `Je lis l'article du ${sujet.source_principale.media}.`);
  let texte = "";
  const url = sujet.source_principale?.url || "";
  if (url.includes("news.google.com")) {
    texte = "(Lien Google Actualités : retrouve l'article original avec la recherche web, à partir de son titre et du média, puis lis-le.)";
  } else {
    try {
      texte = texteArticle(await lire(url));
    } catch (e) {
      redaction.dit("scenariste", "Article illisible, je cherche d'autres sources.");
    }
  }
  return demanderJSON({
    systeme: consigne("scenariste") + "\n\n---\n\n" + SCHEMA + (higgsfieldActif() ? "" : "\n\n---\n\nIMPORTANT : les visuels générés par IA sont désactivés pour l'instant. N'utilise ni `fond_ia` ni la scène `illustration`."),
    recherche: true,
    max: 32000,
    contenu:
      `Date : ${AUJ}. Publication prévue : ${PUBLICATION}.\n\nSujet :\n${JSON.stringify(sujet)}\n\nTexte de l'article principal :\n${texte}\n\n` +
      (sujet.documents || []).map((d) => `Document fourni par la rédaction (${d}) :\n${fs.readFileSync(d, "utf8").slice(0, 20000)}\n\n`).join("") +
      (sujet.images_fournies?.length
        ? `Images fournies par la rédaction (droits réglés, à utiliser en priorité) : dans une scène \`photo\` ou \`photoRonde\`, mets \`"src"\` et \`"credit"\` tels quels au lieu de \`recherche\`.\n${JSON.stringify(sujet.images_fournies)}\n\n`
        : "") +
      (retours ? `CORRECTIONS DEMANDÉES PAR LE CONTRÔLE (version précédente ci-dessous) :\n${JSON.stringify(retours)}\n\n` : "") +
      "Réponds UNIQUEMENT par un seul bloc ```json``` au format « Sortie technique » de ta consigne (sans oublier `rubrique`), sans aucun texte avant ou après. Fais tes recherches, puis écris directement le JSON.",
  });
}

// ---------- 3. Voix + calage + photos ----------
async function produire(script, dossier) {
  const id = `${new Date().toISOString().slice(0, 10)}-${EDITION}-${slug(script.titre || "sujet")}`;
  const voixFichier = `voix-${id}.mp3`;
  if (script.presentateur === "duo" && Array.isArray(script.dialogue) && script.dialogue.length) {
    redaction.dit("scenariste", "J'envoie le dialogue à Lucie et Arthur.");
    await genererDialogue(script.dialogue, path.join("public", voixFichier));
  } else {
    redaction.dit("scenariste", `J'envoie le texte à ${script.presentateur === "arthur" || script.presentateur === "nicolas" ? "Arthur" : "Lucie"}.`);
    await genererVoix(script.voix, script.presentateur, path.join("public", voixFichier));
  }
  if (script.presentateur === "nicolas") script.presentateur = "arthur";
  const duo = script.presentateur === "duo" && Array.isArray(script.dialogue) && script.dialogue.length;
  accelerer(path.join("public", voixFichier), duo ? VITESSE.duo : VITESSE[script.presentateur] || VITESSE.lucie);
  const mots = await transcrire(path.join("public", voixFichier));
  const { sousTitres, ecart } = alignerSousTitres(script.segments, mots);
  if (ecart > 3) redaction.dit("scenariste", `Attention, ${ecart} mots d'écart entre le texte et la voix.`);
  const duree = +(mots[mots.length - 1].end + 1.8).toFixed(2);
  const CONNUS = ["chrono", "titleBib", "calendar", "stats", "crowd", "statement", "bigFigure", "finish", "person", "recap", "photo", "outro", "ballot", "versus", "carte", "frise", "barres", "avantApres", "illustration", "photoRonde"];
  for (const sc of script.scenes) {
    if (!CONNUS.includes(sc.type)) {
      redaction.dit("scenariste", `Pas de modèle « ${sc.type} » : je mets un plein écran texte à la place (demande notée).`);
      const p = sc.props || {};
      sc.props = { text: p.title || p.titre || p.question || p.text || p.kicker || "" };
      sc.type = "statement";
    }
  }
  let scenes = caleScenes(script.scenes, sousTitres, duree);
  // Style actuel : fond vert profond sur toutes les scènes
  scenes.forEach((sc) => (sc.theme = "green"));
  // Pas d'appel à s'abonner sur l'écran de fin
  for (const sc of scenes) if (sc.type === "outro" && /abonn/i.test(sc.props?.cta || "")) delete sc.props.cta;

  // Photos libres demandées par le Scénariste : { type: "photo", props: { recherche: "..." } }
  for (const s of scenes.filter((x) => x.type === "photo" || x.type === "photoRonde")) {
    if (s.props.src && fs.existsSync(path.join("public", s.props.src))) continue; // image fournie par la rédaction
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
  // Visuels générés par IA (Higgsfield) : fonds d'infographie et plans plein écran, en parallèle
  const demandes = [];
  scenes.forEach((s, i) => {
    if (s.type === "illustration" && s.props?.prompt) demandes.push({ s, i, plein: true, prompt: s.props.prompt, animation: !!s.props.animation });
    else if (s.fond_ia?.prompt) demandes.push({ s, i, plein: false, prompt: s.fond_ia.prompt, animation: !!s.fond_ia.animation });
  });
  let animations = 0;
  const retenues = demandes.slice(0, 4).map((d) => ({ ...d, animation: d.animation && animations++ < 2 }));
  if (retenues.length && higgsfieldActif()) redaction.dit("scenariste", `Je commande ${retenues.length} visuel(s) à l'IA.`);
  await Promise.all(
    retenues.map(async (d) => {
      try {
        if (!higgsfieldActif()) throw new Error("clé Higgsfield absente");
        const v = await visuelIA({ prompt: d.prompt, animation: d.animation }, path.join("public", `ia-${id}-${d.i}`));
        const src = path.basename(v.fichier);
        if (d.plein) d.s.props = { ...d.s.props, src, video: v.video, duree: v.duree };
        else d.s.fond_ia = { ...d.s.fond_ia, src, video: v.video, duree: v.duree };
      } catch (e) {
        console.warn("Visuel IA :", e.message);
        d.e = e.message;
      }
    })
  );
  for (const d of demandes) {
    if (d.plein && !d.s.props.src) {
      d.s.type = "statement";
      d.s.props = { text: d.s.props.title || d.s.props.kicker || "" };
    } else if (!d.plein && !d.s.fond_ia?.src) delete d.s.fond_ia;
  }
  const echecs = retenues.filter((d) => d.e);
  if (echecs.length) redaction.dit("scenariste", `Visuels IA non disponibles (${echecs[0].e}) : je continue sans.`);
  const ambiance = script.sensible ? "aucune" : script.ambiance || "neutre";
  // Accents sur les capitales (« Etat » → « État ») dans les sources affichées
  for (const sc of scenes) if (sc.type === "outro" && sc.props?.sources) sc.props.sources = sc.props.sources.replace(/\bEtat\b/g, "État");
  const episode = { id, rubrique: script.rubrique || "VALAIS", ambiance, voice: voixFichier, duration: duree, captions: sousTitres, scenes, meta: { presentateur: script.presentateur, sources: script.sources, faits: script.faits, sensible: script.sensible } };
  fs.mkdirSync("episodes", { recursive: true });
  fs.writeFileSync(`episodes/${id}.json`, JSON.stringify(episode, null, 1));
  redaction.agent("scenariste", "termine");
  redaction.dit("scenariste", "Montage lancé.");
  const mp4 = await rendre(episode, path.join(dossier, `${id}.mp4`));
  return { episode, mp4 };
}

// ---------- 4. Contrôleur ----------
// Phase « texte » : faits, neutralité, droits, sur le script (avant voix et montage, peu coûteux).
async function controlerTexte(script, precedents = null) {
  redaction.agent("controleur", "travaille");
  redaction.dit("controleur", "Je relis le script et je vérifie les faits.");
  const verdict = await demanderJSON({
    systeme: consigne("controleur") + "\n\nPHASE TEXTE : tu n'as pas encore les images. Contrôle uniquement les points 1 (faits), 2 (neutralité et sensibilité), 3 (droits) et la cohérence des scènes avec le texte. Réponds UNIQUEMENT par le bloc ```json``` du verdict.",
    contenu:
      `Date : ${AUJ}. Publication prévue : ${PUBLICATION}.\nScript complet :\n${JSON.stringify(script)}` +
      (precedents
        ? `\n\nDEUXIÈME LECTURE. Corrections que tu avais demandées :\n${JSON.stringify(precedents)}\nVérifie seulement qu'elles ont été faites. Ne soulève un nouveau point que s'il est BLOQUANT (fait faux, absence de neutralité manifeste, problème de droits). Sinon, réponds OK en listant les remarques restantes comme « mineur ».`
        : ""),
    // Première lecture : modèle principal avec recherche web (vérification des faits).
    // Deuxième lecture (seulement vérifier les corrections) : modèle léger, sans recherche.
    recherche: !precedents,
    ...(precedents ? { modele: MODELE_LEGER } : {}),
  });
  redaction.dit("controleur", verdict.message_redaction || verdict.decision);
  return verdict;
}

// Phase « visuel » : charte, lisibilité, zones TikTok, sur les images clés de la vidéo montée.
async function controlerVisuel(episode, dossier) {
  redaction.dit("controleur", "Je regarde les images clés de la vidéo.");
  const images = await imagesCles(episode, path.join(dossier, "cles"));
  const contenu = [
    { type: "text", text: `${HISTOIRE && !HISTOIRE.reprise ? "MODE HISTOIRE IA : légende ou sujet de fond entièrement illustré par des images générées par IA, plein écran, légendées « Image générée avec l'IA ». Le style des images sort volontairement de la charte : ce n'est pas un défaut. Vérifie seulement la lisibilité des textes, les débordements et que rien de choquant n'apparaît.\n" : ""}PHASE VISUEL. Les faits ont déjà été validés. Contrôle uniquement la charte (point 4) et le son (point 5, d'après les sous-titres et la durée).\nÉpisode :\n${JSON.stringify({ duration: episode.duration, scenes: episode.scenes, captions: episode.captions.length })}` },
    ...images.map((f) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: fs.readFileSync(f).toString("base64") } })),
  ];
  const verdict = await demanderJSON({ systeme: consigne("controleur") + "\n\nRéponds UNIQUEMENT par le bloc ```json``` du verdict. Tout texte qui déborde, se chevauche ou sort de l'écran est BLOQUANT.", contenu, modele: MODELE_LEGER });
  redaction.dit("controleur", verdict.message_redaction || verdict.decision);
  redaction.agent("controleur", verdict.decision === "BLOQUE" ? "bloque" : "termine");
  return verdict;
}

// ---------- Réparation automatique ----------
// Le Scénariste corrige l'épisode monté d'après les remarques du contrôle visuel (texte trop long, accord, photo à changer…)
async function reparer(episode, problemes, dossier) {
  redaction.agent("scenariste", "travaille");
  redaction.dit("scenariste", "Le Contrôleur a bloqué des images : je corrige et je refais le montage.");
  let patch;
  try {
    patch = await demanderJSON({
      systeme:
        consigne("scenariste") +
        "\n\nRÉPARATION. On te donne l'épisode monté et les remarques du contrôle visuel. Corrige uniquement ce qui est signalé, sans changer la voix ni le minutage (from/to). Réponds UNIQUEMENT par un bloc ```json``` : {\"corrections\": [ {\"scene\": n, \"props\": {…seulement les propriétés à modifier…}} | {\"scene\": n, \"nouvelle_photo\": \"autres mots-clés de recherche, précis et visuels\"} | {\"scene\": n, \"en_texte\": \"titre court\"} ]}. Utilise « nouvelle_photo » (mots-clés simples, 2 à 4 mots) si une photo est hors sujet ou trompeuse ; garde les photos autant que possible (une pub visible n'est pas une raison de la retirer) ; « en_texte » seulement en dernier recours.",
      contenu: `Remarques :\n${JSON.stringify(problemes)}\n\nÉpisode (scènes numérotées à partir de 0) :\n${JSON.stringify(episode.scenes)}`,
    });
  } catch (e) {
    console.warn("Réparation :", e.message);
    return false;
  }
  let n = 0;
  for (const c of patch.corrections || []) {
    const s = episode.scenes[c.scene];
    if (!s) continue;
    if (c.props) Object.assign(s.props, c.props), n++;
    if (c.nouvelle_photo) {
      const f = path.join("public", `photo-${episode.id}-${c.scene}-r.jpg`);
      const p = await photoLibre(c.nouvelle_photo, f).catch(() => null);
      if (p) {
        s.props = { ...s.props, recherche: c.nouvelle_photo, src: path.basename(f), credit: p.credit };
        n++;
      }
      // Aucune photo trouvée : on garde l'ancienne plutôt que de passer en écran texte
    }
    if (c.en_texte) {
      s.type = "statement";
      s.props = { text: c.en_texte, kicker: s.props.kicker };
      n++;
    }
  }
  redaction.dit("scenariste", n ? `${n} correction(s) appliquée(s), je relance le montage.` : "Rien de corrigeable automatiquement.");
  return n > 0;
}

// Mémoire des remarques (bloquant / important) : réinjectée dans les consignes des prochaines éditions
function noterRemarques(problemes, episode) {
  const f = "state/remarques.json";
  const anciennes = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : [];
  const nouvelles = problemes
    .filter((p) => p.gravite === "bloquant" || p.gravite === "important")
    .map((p) => ({ date: AUJ, gravite: p.gravite, type: episode.scenes[p.scene]?.type, constat: String(p.constat || "").slice(0, 300) }));
  fs.mkdirSync("state", { recursive: true });
  fs.writeFileSync(f, JSON.stringify([...anciennes, ...nouvelles].slice(-60), null, 1));
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
// Sujet imposé par la rédaction (lancer-edition.json → "sujet") : pas de veille, le Scénariste complète
const SUJET_IMPOSE = process.env.SUJET ? JSON.parse(process.env.SUJET) : null;
if (SUJET_IMPOSE) redaction.dit("veilleur", `Sujet choisi par la rédaction : « ${SUJET_IMPOSE.titre_travail} ». Je transmets au Scénariste.`);
// Mode HISTOIRE IA : script et visuels préparés en conversation (Claude + Higgsfield), le pipeline fait voix, montage, contrôle
const HISTOIRE = process.env.HISTOIRE ? JSON.parse(fs.readFileSync(process.env.HISTOIRE, "utf8")) : null;
if (HISTOIRE) redaction.dit("veilleur", `HISTOIRE IA : « ${HISTOIRE.titre} ». Script et images déjà prêts, on passe au montage.`);
const sujets = HISTOIRE ? [{ titre_travail: HISTOIRE.titre }] : SUJET_IMPOSE ? [SUJET_IMPOSE] : await veille();
// Mode « veille seule » : proposer des sujets sans produire de vidéo
if (process.env.VEILLE_SEULE) {
  await redaction.fin();
  process.exit(0);
}
const prets = [];
for (const sujet of sujets) {
 try {
  const ctx = `${new Date().toISOString().slice(0, 10)}-${EDITION}-${slug(sujet.titre_travail)}`;
  definirContexte(ctx);
  const dossier = path.resolve("out", slug(sujet.titre_travail));
  fs.mkdirSync(dossier, { recursive: true });
  if (HISTOIRE) {
    // Visuels générés par IA fournis par lien : téléchargés dans public/
    for (const [i, sc] of HISTOIRE.scenes.entries()) {
      if (!sc.props?.url) continue;
      const ext = sc.props.video ? "mp4" : (sc.props.url.split("?")[0].match(/\.(png|jpe?g|webp)$/i) || [0, "jpg"])[1];
      const f = `histoire-${slug(HISTOIRE.titre)}-${i}.${ext}`;
      const r = await fetch(sc.props.url);
      if (!r.ok) throw new Error(`Visuel ${i} introuvable (${r.status})`);
      fs.writeFileSync(path.join("public", f), Buffer.from(await r.arrayBuffer()));
      sc.props.src = f;
      delete sc.props.url;
    }
  }
  let script = HISTOIRE || (await ecrire(sujet));
  let verdictTexte = HISTOIRE ? { decision: "OK", problemes: [] } : await controlerTexte(script);
  // Un seul aller-retour de corrections, et seulement s'il y a au moins une remarque « important » ou « bloquant »
  const aCorriger = (v) => v.decision === "A_CORRIGER" && (v.problemes || []).some((p) => p.gravite !== "mineur");
  for (let tour = 0; tour < 1 && aCorriger(verdictTexte); tour++) {
    script = await ecrire(sujet, { version_precedente: script, problemes: verdictTexte.problemes });
    verdictTexte = await controlerTexte(script, verdictTexte.problemes);
  }
  const bloquant = verdictTexte.decision === "BLOQUE" || (verdictTexte.problemes || []).some((p) => p.gravite === "bloquant");
  if (verdictTexte.decision === "A_CORRIGER" && !bloquant) {
    redaction.dit("controleur", "Il reste des remarques mineures, je les note pour Jérémy. On passe au montage.");
  }
  if (bloquant) {
    redaction.dit("controleur", "Je bloque ce sujet, il ne part pas au montage.");
    redaction.episode({ id: `${new Date().toISOString().slice(0, 10)}-${EDITION}-${slug(sujet.titre_travail)}`, titre: sujet.titre_travail, etat: "bloque", problemes: verdictTexte.problemes });
    continue;
  }
  const resultat = await produire(script, dossier);
  let verdictVisuel = await controlerVisuel(resultat.episode, dossier);
  // Réparation automatique (une fois) : si le contrôle visuel bloque, on corrige l'épisode, on refait le rendu et on recontrôle
  const estBloque = (v) => v.decision === "BLOQUE" || (v.problemes || []).some((p) => p.gravite === "bloquant");
  if (estBloque(verdictVisuel)) {
    const ok = await reparer(resultat.episode, verdictVisuel.problemes || [], dossier);
    if (ok) {
      resultat.mp4 = await rendre(resultat.episode, resultat.mp4);
      fs.writeFileSync(path.join("episodes", `${resultat.episode.id}.json`), JSON.stringify(resultat.episode, null, 1));
      verdictVisuel = await controlerVisuel(resultat.episode, dossier);
    }
  }
  noterRemarques([...(verdictTexte.problemes || []), ...(verdictVisuel.problemes || [])], resultat.episode);
  const verdict = {
    // Toute remarque « bloquant » du contrôle visuel bloque la vidéo, même si le modèle a répondu OK
    decision: verdictVisuel.decision === "BLOQUE" || (verdictVisuel.problemes || []).some((p) => p.gravite === "bloquant") ? "BLOQUE" : "OK",
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
    cout_usd: coutDe(ctx),
  };
  redaction.episode(info);
  histo.push({ titre: sujet.titre_travail, date: new Date().toISOString(), id: info.id });
  prets.push(info);
 } catch (e) {
  redaction.dit("systeme", `Sujet « ${sujet.titre_travail} » abandonné : ${String(e?.stack || e).slice(0, 900)}`);
 }
}
fs.writeFileSync(HISTO, JSON.stringify(histo.slice(-200), null, 1));
const { execution } = await enregistrer(`édition ${EDITION} ${new Date().toISOString().slice(0, 10)}`);
redaction.dit("systeme", `Coût de cette édition : ${execution.usd.toFixed(2)} $ (Claude + ElevenLabs).`);
fs.writeFileSync("out/edition.json", JSON.stringify(prets, null, 1));
redaction.agent("diffuseur", "attend");
redaction.dit("diffuseur", prets.some((p) => p.etat === "a_valider") ? "Vidéo prête, j'attends le feu vert de Jérémy." : "Rien à publier pour cette édition.");
await redaction.fin();
