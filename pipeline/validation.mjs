// Après une édition : chaque vidéo devient une release (lecture du MP4 depuis le téléphone)
// et une issue « à valider ». Commenter « OK » sur l'issue déclenche la publication.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const gh = (...a) => execFileSync("gh", a, { encoding: "utf8" }).trim();
const ed = fs.existsSync("out/edition.json") ? JSON.parse(fs.readFileSync("out/edition.json", "utf8")) : [];

try {
  gh("label", "create", "a-valider", "--color", "1E5B4F", "--force");
  gh("label", "create", "bloque", "--color", "B60205", "--force");
  gh("label", "create", "publie", "--color", "6B6860", "--force");
} catch {}

for (const v of ed) {
  const tag = `video-${v.id}`;
  gh("release", "create", tag, v.mp4, "--title", v.titre || v.id, "--notes", "Vidéo générée automatiquement par Le Pouls.", "--prerelease");
  const url = gh("release", "view", tag, "--json", "assets", "--jq", ".assets[0].url");
  const problemes = (v.problemes || []).map((p) => `- **${p.gravite}** (scène ${p.scene}) : ${p.constat}`).join("\n") || "Aucun.";
  const sources = (v.sources || []).map((s) => `- [${s.media} : ${s.titre}](${s.url})`).join("\n");
  const body = `<!-- episode:${v.id} -->
**Édition du ${v.edition}**, décision du Contrôleur : **${v.decision}**

▶️ [Voir la vidéo](${url})

### Remarques du Contrôleur
${problemes}

### Sources
${sources}

### Description TikTok
<!-- description -->
${v.description_tiktok || ""}
<!-- /description -->

---
${v.etat === "a_valider" ? "Pour publier : commente **OK** sur cette issue." : "⛔ Bloquée par le Contrôleur : à revoir avant toute publication."}`;
  fs.writeFileSync("out/issue.md", body);
  gh("issue", "create", "--title", `🎬 ${v.titre || v.id}`, "--body-file", "out/issue.md", "--label", v.etat === "a_valider" ? "a-valider" : "bloque", "--assignee", process.env.GITHUB_REPOSITORY_OWNER || "@me");
  console.log("Issue créée pour", v.id);
}
