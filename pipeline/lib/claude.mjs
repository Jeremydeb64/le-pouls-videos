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
export async function demander({ systeme, contenu, modele = MODELE_REDACTION, max = 8000, recherche = false }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY manquante (secret GitHub).");
  const body = {
    model: modele,
    max_tokens: max,
    system: systeme,
    messages: [{ role: "user", content: contenu }],
  };
  if (recherche) body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 6 }];
  for (let essai = 1; essai <= 3; essai++) {
    const r = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.status === 429 || r.status >= 500) {
      await new Promise((ok) => setTimeout(ok, 5000 * essai));
      continue;
    }
    const d = await r.json();
    if (!r.ok) throw new Error(`Claude ${r.status} : ${JSON.stringify(d).slice(0, 400)}`);
    return d.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  }
  throw new Error("Claude indisponible après 3 essais.");
}

// Extrait le premier objet JSON d'une réponse (tolère ```json ... ```).
export function json(texte) {
  const m = texte.match(/```json\s*([\s\S]*?)```/) || texte.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error("Pas de JSON dans la réponse : " + texte.slice(0, 300));
  return JSON.parse(m[1]);
}
