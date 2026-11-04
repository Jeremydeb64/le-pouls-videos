// Mini rédaction dans le terminal.
//   node pipeline/terminal.mjs            → suit l'édition en direct (GitHub, via le script Google)
//   node pipeline/terminal.mjs --local    → suit l'édition qui tourne sur cet ordinateur (state/status.json)
//   node pipeline/terminal.mjs --demo     → démonstration
import fs from "node:fs";

const URL_ETAT = "https://script.google.com/macros/s/AKfycbw_kNNMFTU7mo957ry6olWuJwdbuEmS-RGPOQ8mz25TTNxdM9AcEb38Q9DYwGDy2pfiLQ/exec";
const MODE = process.argv.includes("--demo") ? "demo" : process.argv.includes("--local") ? "local" : "direct";
const ARRET_AUTO = process.argv.includes("--jusqua-fin"); // utilisé par edition:ecran

// Couleurs (proches de la charte : vert sapin, encre, gris)
const E = "\x1b[";
const vert = (s) => `${E}38;5;29m${s}${E}0m`;
const vertClair = (s) => `${E}38;5;72m${s}${E}0m`;
const gris = (s) => `${E}38;5;244m${s}${E}0m`;
const gras = (s) => `${E}1m${s}${E}0m`;
const rouge = (s) => `${E}38;5;160m${s}${E}0m`;
const inverse = (s) => `${E}48;5;29m${E}38;5;255m${s}${E}0m`;

const AGENTS = ["veilleur", "scenariste", "controleur", "diffuseur"];
const NOMS = { veilleur: "VEILLEUR", scenariste: "SCÉNARISTE", controleur: "CONTRÔLEUR", diffuseur: "DIFFUSEUR", systeme: "SYSTÈME" };
const COL = 26;

// Dessins : [repos, travail image 1, travail image 2]
const DESSINS = {
  veilleur: (f, etat) => [
    " ┏━━━┓        .--.     ",
    ` ┃▌▐▌┃       ${etat === "attend" ? "(-_-)" : f ? "(o_o)" : "(O_O)"}    `,
    " ┃▐▌▌┃      /▓▓▓▓\\    ",
    ` ┃▌▐▐┃     ${f ? "═[≡≡≡]═" : "═[≡ ≡]═"}    `,
    " ┗━━━┛   ▔▔▔▔▔▔▔▔▔▔▔   ",
  ],
  scenariste: (f, etat) => [
    "     @     ┌───────┐   ",
    `   ${etat === "attend" ? "(-_-)" : "(^_^)"}   │${etat === "travaille" ? (f ? "≡≡≡≡  " : "≡≡≡≡≡≡") : "      "} │   `,
    `   /▓▓▓\\   │${etat === "travaille" ? (f ? "≡≡    " : "≡≡≡   ") : "      "} │   `,
    `   ${etat === "travaille" ? (f ? "╯╯" : "╰╰") : "  "}      └───┬───┘   `,
    "  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔   ",
  ],
  controleur: (f, etat) => [
    "    ___      ┌─────┐   ",
    `   ${etat === "attend" ? "(-_-)" : "(•_•)"}     │▓▓▓▓▓│   `,
    `   /▓▓▓\\${etat === "travaille" ? (f ? "─O  " : "  ─O") : "    "}│▒▒▒  │   `,
    "             │▒▒▒▒ │   ",
    "  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔   ",
  ],
  diffuseur: (f, etat) => [
    "    ╭───╮              ",
    `   ◖${etat === "attend" ? "(-_-)" : "(•‿•)"}◗   ┌─┐     `,
    `    /▓▓▓\\    │${etat === "travaille" ? (f ? "▶" : " ") : "▶"}│     `,
    "             └─┘       ",
    "  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔    ",
  ],
};

const coupe = (texte, largeur, lignes) => {
  const mots = String(texte || "").split(/\s+/);
  const out = [""];
  for (const m of mots) {
    if ((out[out.length - 1] + " " + m).trim().length > largeur) out.push(m);
    else out[out.length - 1] = (out[out.length - 1] + " " + m).trim();
  }
  if (out.length > lignes) {
    out.length = lignes;
    out[lignes - 1] = out[lignes - 1].slice(0, largeur - 1) + "…";
  }
  return out;
};
const pad = (s, n) => s + " ".repeat(Math.max(0, n - [...s].length));
const heure = (t) => new Date(t).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });

let etatCourant = { agents: {}, messages: [], episodes: [] };
let image = 0;

function dessiner() {
  const s = etatCourant;
  const L = [];
  const enCours = Object.values(s.agents || {}).includes("travaille");
  L.push("");
  L.push(`  ${vert(gras("///"))} ${gras("Le Pouls")}  ${gris("la rédaction")}      ${enCours ? vertClair("● édition du " + (s.edition || "") + " en cours") : gris("○ en pause" + (s.maj ? ", dernière activité " + heure(s.maj) : ""))}${MODE === "demo" ? "  " + inverse(" DÉMO ") : ""}`);
  L.push("");
  // Bulles : dernier message récent de chaque agent
  const recents = (s.messages || []).slice(-4);
  const bulles = AGENTS.map((a) => {
    const m = [...recents].reverse().find((x) => x.agent === a);
    return m ? coupe(m.texte, COL - 4, 3) : [];
  });
  for (let l = 0; l < 5; l++) {
    L.push(
      "  " +
        AGENTS.map((a, i) => {
          const b = bulles[i];
          if (!b.length) return pad("", COL);
          if (l === 0) return pad(" ╭" + "─".repeat(COL - 4) + "╮", COL);
          if (l === 4) return pad(" ╰─┬" + "─".repeat(COL - 6) + "╯", COL);
          return " │" + pad(b[l - 1] || "", COL - 4) + "│ ";
        }).join("")
    );
  }
  for (let l = 0; l < 5; l++) {
    L.push(
      "  " +
        AGENTS.map((a) => {
          const etat = (s.agents || {})[a] || "attend";
          const lignes = DESSINS[a](image % 2, etat);
          let t = pad(lignes[l], COL);
          if (etat === "attend") t = gris(t);
          else if (etat === "travaille") t = vert(t);
          return t;
        }).join("")
    );
  }
  L.push(
    "  " +
      AGENTS.map((a) => {
        const etat = (s.agents || {})[a] || "attend";
        const signe = etat === "termine" ? "✓" : etat === "bloque" ? "!" : etat === "travaille" ? "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"[image % 10] : "z";
        const couleur = etat === "termine" || etat === "travaille" ? vertClair : etat === "bloque" ? rouge : gris;
        const nom = "   " + NOMS[a] + " ";
        return gras(nom) + couleur(signe) + " ".repeat(Math.max(0, COL - [...nom].length - 1));
      }).join("")
  );
  L.push("");
  L.push("  " + gris("─".repeat(COL * 4 - 2)));
  L.push("  " + gras("Le fil"));
  const fil = (s.messages || []).slice(-7);
  if (!fil.length) L.push("  " + gris("Aucun échange pour l'instant."));
  for (const m of fil) {
    const qui = m.agent === "systeme" ? gris(pad(NOMS.systeme, 12)) : vert(pad(NOMS[m.agent] || m.agent, 12));
    L.push(`  ${gris(heure(m.t))}  ${qui}${coupe(m.texte, COL * 4 - 24, 1)[0]}`);
  }
  const eps = (s.episodes || []).slice(-3);
  if (eps.length) {
    L.push("");
    L.push("  " + gras("Les vidéos"));
    for (const e of eps) {
      const badge = e.etat === "a_valider" ? vertClair("[à valider]") : e.etat === "bloque" ? rouge("[bloquée]") : e.etat === "publie" ? gris("[publiée]") : gris(`[${e.etat || ""}]`);
      L.push(`  ${badge} ${e.titre || e.id}${e.lien_issue ? gris("  " + e.lien_issue) : ""}`);
    }
  }
  L.push("");
  L.push(gris("  Ctrl+C pour quitter"));
  process.stdout.write(`${E}H${E}2J` + L.join("\n"));
}

// ---------- sources ----------
async function lireDirect() {
  try {
    const r = await fetch(URL_ETAT, { cache: "no-store" });
    const s = await r.json();
    if (s && s.messages) etatCourant = s;
  } catch {}
}
function lireLocal() {
  try {
    etatCourant = JSON.parse(fs.readFileSync("state/status.json", "utf8"));
  } catch {}
}
const SCENARIO = [
  ["veilleur", "travaille", "Édition du soir, je fais le tour des sources."],
  ["veilleur", "travaille", "J'ai trois papiers sur le même sujet, je garde celui du Nouvelliste."],
  ["veilleur", "termine", "Je garde « Salaire minimum : le vote du 29 novembre »."],
  ["scenariste", "travaille", "Je lis l'article et je cherche la source officielle du Canton."],
  ["controleur", "travaille", "Je vérifie les chiffres : 22 francs, 15'000 salariés, OK."],
  ["controleur", "travaille", "Carte 3 trop longue, tu raccourcis ?"],
  ["scenariste", "travaille", "C'est fait, j'envoie le texte à Lucie."],
  ["scenariste", "termine", "Montage lancé."],
  ["controleur", "termine", "Images clés OK, rien ne déborde. Feu vert."],
  ["diffuseur", "attend", "Vidéo prête, j'attends le feu vert de Jérémy."],
];
let iDemo = 0;
function pasDemo() {
  if (iDemo >= SCENARIO.length) {
    iDemo = 0;
    etatCourant = { edition: "soir", agents: {}, messages: [], episodes: [] };
    return;
  }
  const [a, etat, texte] = SCENARIO[iDemo++];
  const s = etatCourant;
  s.edition = "soir";
  s.agents = s.agents || {};
  for (const x of AGENTS) if (x !== a && s.agents[x] === "travaille") s.agents[x] = "termine";
  s.agents[a] = etat;
  s.messages = [...(s.messages || []), { agent: a, texte, t: new Date().toISOString() }];
  s.maj = new Date().toISOString();
  if (iDemo === SCENARIO.length) s.episodes = [{ titre: "Salaire minimum : le vote du 29 novembre", etat: "a_valider" }];
}

process.stdout.write(`${E}?25l`); // cache le curseur
const quitter = () => {
  process.stdout.write(`${E}?25h\n`);
  process.exit(0);
};
process.on("SIGINT", quitter);
process.on("SIGTERM", quitter);

if (MODE === "demo") {
  etatCourant = { edition: "soir", agents: {}, messages: [], episodes: [] };
  setInterval(pasDemo, 2200);
} else if (MODE === "local") {
  lireLocal();
  setInterval(lireLocal, 800);
} else {
  await lireDirect();
  setInterval(lireDirect, 8000);
}
setInterval(() => {
  image++;
  dessiner();
}, 300);
if (ARRET_AUTO) process.on("message", (m) => m === "fin" && quitter());
