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

const save = (s) => {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  s.maj = new Date().toISOString();
  s.messages = s.messages.slice(-80);
  fs.writeFileSync(FILE, JSON.stringify(s, null, 1));
};

export const redaction = {
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
