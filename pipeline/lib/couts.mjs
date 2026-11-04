// Suivi des coûts des API payantes (Claude, ElevenLabs) et des soldes disponibles.
// Chaque appel est noté avec sa quantité et son coût estimé au tarif public (config/tarifs.json).
// Le journal est archivé dans state/couts.json (lu par la page de la rédaction).
import fs from "node:fs";

const TARIFS = JSON.parse(fs.readFileSync("config/tarifs.json", "utf8"));
const FICHIER = "state/couts.json";
const lignes = [];
let contexte = "veille";

export const tarifs = TARIFS;
export const definirContexte = (c) => (contexte = c);
const arrondi = (x) => Math.round(x * 10000) / 10000;

export function noter(service, operation, quantite, unite, usd) {
  lignes.push({ date: new Date().toISOString(), contexte, service, operation, quantite, unite, usd: arrondi(usd) });
}

// usage : objet « usage » renvoyé par l'API Messages
export function noterClaude(modele, usage = {}) {
  const t = TARIFS.anthropic[modele] || TARIFS.anthropic["claude-sonnet-5-5"];
  const e = usage.input_tokens || 0, s = usage.output_tokens || 0;
  const cl = usage.cache_read_input_tokens || 0, ce = usage.cache_creation_input_tokens || 0;
  const usd = (e * t.entree + s * t.sortie + cl * t.cache_lecture + ce * t.cache_ecriture) / 1e6;
  noter("anthropic", modele, e + s + cl + ce, "tokens", usd);
  const rech = usage.server_tool_use?.web_search_requests || 0;
  if (rech) noter("anthropic", "recherche web", rech, "recherches", (rech * TARIFS.anthropic.recherche_web_par_1000) / 1000);
}

// ElevenLabs : coût réel en crédits lu dans l'en-tête de réponse si présent, sinon nombre de caractères
export function noterVoix(operation, reponse, caracteres) {
  const h = reponse?.headers;
  const credits = +(h?.get("character-cost") || h?.get("x-character-count") || 0) || caracteres;
  noter("elevenlabs", operation, credits, "crédits", (credits / 1000) * TARIFS.elevenlabs.tts_par_1000_caracteres);
}
export function noterTranscription(secondes) {
  noter("elevenlabs", "transcription", Math.round(secondes), "secondes", (secondes / 3600) * TARIFS.elevenlabs.stt_par_heure);
}

// Soldes : crédits ElevenLabs restants (permission « User: Read » de la clé) et coûts Anthropic du mois (clé Admin facultative)
export async function lireSoldes() {
  const soldes = { date: new Date().toISOString() };
  const kEl = process.env.ELEVENLABS_API_KEY;
  if (kEl) {
    try {
      const r = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": kEl } });
      if (r.ok) {
        const d = await r.json();
        soldes.elevenlabs = {
          plan: d.tier,
          credits_utilises: d.character_count,
          credits_mois: d.character_limit,
          credits_restants: d.character_limit - d.character_count,
          renouvellement: d.next_character_count_reset_unix ? new Date(d.next_character_count_reset_unix * 1000).toISOString() : null,
        };
      } else soldes.elevenlabs = { erreur: `Solde illisible (${r.status}) : activer la permission « User → Read » sur la clé ElevenLabs.` };
    } catch (e) {
      soldes.elevenlabs = { erreur: String(e.message || e) };
    }
  }
  const kAdmin = process.env.ANTHROPIC_ADMIN_KEY;
  if (kAdmin) {
    try {
      const debut = new Date();
      debut.setUTCDate(1);
      debut.setUTCHours(0, 0, 0, 0);
      let total = 0, page = null;
      for (let i = 0; i < 10; i++) {
        const u = new URL("https://api.anthropic.com/v1/organizations/cost_report");
        u.searchParams.set("starting_at", debut.toISOString());
        u.searchParams.set("limit", "31");
        if (page) u.searchParams.set("page", page);
        const r = await fetch(u, { headers: { "x-api-key": kAdmin, "anthropic-version": "2023-06-01" } });
        if (!r.ok) throw new Error(`cost_report ${r.status}`);
        const d = await r.json();
        for (const b of d.data || []) for (const x of b.results || []) total += parseFloat(x.amount || 0);
        if (!d.has_more) break;
        page = d.next_page;
      }
      // Le rapport est en cents USD
      soldes.anthropic = { mois_en_cours_usd: arrondi(total / 100), source: "Admin API (coût réel)" };
    } catch (e) {
      soldes.anthropic = { erreur: String(e.message || e) };
    }
  }
  return soldes;
}

const jourZurich = (iso) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Zurich" });

// Ajoute les lignes de cette exécution au journal, met à jour les totaux et les soldes
export async function enregistrer(etiquette = "") {
  const j = fs.existsSync(FICHIER) ? JSON.parse(fs.readFileSync(FICHIER, "utf8")) : { lignes: [] };
  const execution = { date: new Date().toISOString(), etiquette, usd: arrondi(lignes.reduce((s, l) => s + l.usd, 0)) };
  j.lignes = [...(j.lignes || []), ...lignes.map((l) => ({ ...l, execution: etiquette }))];
  // Garder 120 jours de détail
  const limite = Date.now() - 120 * 864e5;
  j.lignes = j.lignes.filter((l) => new Date(l.date).getTime() > limite);
  j.executions = [...(j.executions || []), execution].slice(-200);
  const parJour = {}, parMois = {}, parVideo = {};
  for (const l of j.lignes) {
    const d = jourZurich(l.date), m = d.slice(0, 7);
    for (const [tab, k] of [[parJour, d], [parMois, m]]) {
      tab[k] ??= { anthropic: 0, elevenlabs: 0, higgsfield: 0, total: 0 };
      tab[k][l.service] = arrondi((tab[k][l.service] || 0) + l.usd);
      tab[k].total = arrondi(tab[k].total + l.usd);
    }
    if (l.contexte && l.contexte !== "veille") parVideo[l.contexte] = arrondi((parVideo[l.contexte] || 0) + l.usd);
  }
  j.par_jour = parJour;
  j.par_mois = parMois;
  j.par_video = parVideo;
  j.soldes = await lireSoldes();
  const b = TARIFS.budget || {};
  if (b.anthropic_credit_achete_usd && b.anthropic_credit_depuis) {
    const depense = j.lignes.filter((l) => l.service === "anthropic" && jourZurich(l.date) >= b.anthropic_credit_depuis).reduce((s, l) => s + l.usd, 0);
    j.soldes.anthropic = { ...(j.soldes.anthropic || {}), credit_estime_restant_usd: arrondi(b.anthropic_credit_achete_usd - depense), depuis: b.anthropic_credit_depuis };
  }
  j.usd_chf = TARIFS.usd_chf;
  j.maj = new Date().toISOString();
  fs.mkdirSync("state", { recursive: true });
  fs.writeFileSync(FICHIER, JSON.stringify(j, null, 1));
  // Résumé dans la page du run GitHub Actions
  if (process.env.GITHUB_STEP_SUMMARY) {
    const chf = (u) => `${u.toFixed(2)} $ (≈ ${(u * TARIFS.usd_chf).toFixed(2)} CHF)`;
    const auj = parJour[jourZurich(new Date().toISOString())] || { total: 0 };
    const mois = parMois[jourZurich(new Date().toISOString()).slice(0, 7)] || { total: 0 };
    const el = j.soldes.elevenlabs;
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Coûts API\n- Cette exécution : **${chf(execution.usd)}**\n- Aujourd'hui : ${chf(auj.total)} — ce mois : ${chf(mois.total)}\n- ElevenLabs : ${el?.credits_restants != null ? `${el.credits_restants.toLocaleString("fr-CH")} crédits restants sur ${el.credits_mois.toLocaleString("fr-CH")}` : el?.erreur || "—"}\n`);
  }
  return { execution, journal: j };
}

export const coutDe = (ctx) => arrondi(lignes.filter((l) => l.contexte === ctx).reduce((s, l) => s + l.usd, 0));
