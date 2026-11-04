// Journal de la rédaction : alimente la mini rédaction (state/status.json) et les logs.
import fs from "node:fs";
import path from "node:path";

const FILE = path.resolve("state/status.json");

const load = () => {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return { edition: null, etape: "repos", agents: {}, messages: [] };
  }
};

// Diffusion en direct vers la mini rédaction (via le script Google), au plus toutes les 4 secondes.
const URL_SCRIPT = process.env.DRIVE_WEBAPP_URL_FORCEE || "https://script.google.com/macros/s/AKfycbw_kNNMFTU7mo957ry6olWuJwdbuEmS-RGPOQ8mz25TTNxdM9AcEb38Q9DYwGDy2pfiLQ/exec";
let enAttente = null;
let minuterie = null;
let envoi = Promise.resolve();
const compact = (s) => ({
  ...s,
  messages: s.messages.slice(-22).map((m) => ({ ...m, texte: m.texte.slice(0, 220) })),
  episodes: (s.episodes || []).slice(-6).map((e) => ({ id: e.id, titre: e.titre, etat: e.etat, lien_video: e.lien_video, lien_drive: e.lien_drive, lien_issue: e.lien_issue })),
});
function diffuser(s) {
  if (!process.env.DRIVE_SECRET) return;
  enAttente = compact(s);
  if (minuterie) return;
  minuterie = setTimeout(() => {
    minuterie = null;
    const statut = enAttente;
    envoi = envoi.then(() =>
      fetch(URL_SCRIPT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ secret: process.env.DRIVE_SECRET.trim(), action: "statut", statut }) }).catch(() => {})
    );
  }, 4000);
}

const save = (s) => {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  s.maj = new Date().toISOString();
  s.messages = s.messages.slice(-80);
  fs.writeFileSync(FILE, JSON.stringify(s, null, 1));
  diffuser(s);
};

export const redaction = {
  // À appeler en fin de script : envoie le dernier état
  async fin() {
    if (minuterie) {
      clearTimeout(minuterie);
      minuterie = null;
      const statut = enAttente;
      envoi = envoi.then(() => fetch(URL_SCRIPT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ secret: process.env.DRIVE_SECRET.trim(), action: "statut", statut }) }).catch(() => {}));
    }
    await envoi;
  },
  debut(edition) {
    const s = load();
    s.edition = edition;
    s.etape = "veille";
    s.agents = { veilleur: "travaille", scenariste: "attend", controleur: "attend", diffuseur: "attend" };
    save(s);
  },
  agent(nom, etat) {
    const s = load();
    s.agents[nom] = etat; // "attend" | "travaille" | "termine" | "bloque"
    s.etape = etat === "travaille" ? nom : s.etape;
    save(s);
  },
  dit(nom, texte) {
    const s = load();
    s.messages.push({ agent: nom, texte, t: new Date().toISOString() });
    save(s);
    console.log(`[${nom}] ${texte}`);
  },
  episode(info) {
    const s = load();
    const avant = (s.episodes || []).find((e) => e.id === info.id) || {};
    s.episodes = [...(s.episodes || []).filter((e) => e.id !== info.id), { ...avant, ...info }].slice(-20);
    save(s);
  },
};
