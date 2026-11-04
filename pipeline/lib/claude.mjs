// Appel à l'API Claude (Anthropic) sans dépendance externe.
import fs from "node:fs";

const API = "https://api.anthropic.com/v1/messages";
export const MODELE_REDACTION = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
export const MODELE_LEGER = process.env.CLAUDE_MODEL_LEGER || "claude-haiku-5-5";

export const consigne = (agent) => fs.readFileSync(`agents/${agent}.md`, "utf8");

/**
 * contenu : string ou tableau de blocs (texte / images)
 * outils : active la recherche web côté serveur si besoin
 */
export async function demander({ systeme, contenu, modele = MODELE_REDACTION, max = 16000, recherche = false }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY manquante (secret GitHub).");
  const body = {
    model: modele,
    max_tokens: max,
    system: systeme,
    messages: [{ role: "user", content: contenu }],
  };
  if (recherche) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }];
  const textes = [];
  for (let tour = 0; tour < 6; tour++) {
    const d = await appel(key, body);
    textes.push(...d.content.filter((b) => b.type === "text").map((b) => b.text));
    // Recherche web longue : l'API rend la main (pause_turn), on relance avec la réponse partielle.
    if (d.stop_reason === "pause_turn") {
      body.messages = [...body.messages.slice(0, 1), { role: "assistant", content: d.content }];
      continue;
    }
    if (d.stop_reason === "max_tokens") throw new Error("Réponse de Claude tronquée (max_tokens atteint).");
    return textes.join("\n");
  }
  throw new Error("Claude n'a pas terminé après 6 relances.");
}

async function appel(key, body) {
  for (let essai = 1; essai <= 4; essai++) {
    const r = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.status === 429 || r.status === 529 || r.status >= 500) {
      await new Promise((ok) => setTimeout(ok, 10000 * essai));
      continue;
    }
    const d = await r.json();
    if (!r.ok) throw new Error(`Claude ${r.status} : ${JSON.stringify(d).slice(0, 400)}`);
    return d;
  }
  throw new Error("Claude indisponible après 4 essais.");
}

// Extrait le premier objet JSON d'une réponse (tolère ```json ... ```).
export function json(texte) {
  const blocs = [...texte.matchAll(/```json\s*([\s\S]*?)```/g)].map((m) => m[1]);
  const debut = texte.indexOf("{");
  const fin = texte.lastIndexOf("}");
  if (debut >= 0 && fin > debut) blocs.push(texte.slice(debut, fin + 1));
  for (const b of blocs.reverse()) {
    try {
      return JSON.parse(b);
    } catch {}
  }
  throw new Error("JSON illisible dans la réponse de Claude : " + texte.slice(0, 500));
}
