// Après une édition : chaque vidéo devient une release (lecture du MP4 depuis le téléphone)
// et une issue « à valider ». Commenter « OK » sur l'issue déclenche la publication.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { driveActif, deposerSurDrive, nomsDrive } from "./lib/drive.mjs";
import { redaction } from "./lib/redaction.mjs";

const gh = (...a) => execFileSync("gh", a, { encoding: "utf8" }).trim();
const ed = fs.existsSync("out/edition.json") ? JSON.parse(fs.readFileSync("out/edition.json", "utf8")) : [];

try {
  gh("label", "create", "a-valider", "--color", "1E5B4F", "--force");
  gh("label", "create", "bloque", "--color", "B60205", "--force");
  gh("label", "create", "publie", "--color", "6B6860", "--force");
} catch {}

const creneau = (e) => (e === "matin" ? "vers 7 h 30" : e === "jour" ? "en fin d'après-midi (vers 17 h 30)" : "vers 18 h 30");

for (const v of ed) {
  // Dossier de publication : vidéo + texte d'accompagnement, prêt à poster à la main
  const nom = `LePouls_${v.id}`;
  const dossier = path.join("out", "publications", nom);
  fs.mkdirSync(dossier, { recursive: true });
  fs.copyFileSync(v.mp4, path.join(dossier, `${nom}.mp4`));
  const sources = (v.sources || []).map((s) => `- ${s.media} : ${s.titre} (${s.url})`).join("\n");
  const texte = `LE POULS
${v.titre || v.id}
Édition du ${v.edition}, à publier ${creneau(v.edition)}

=== TEXTE DE PUBLICATION (à copier dans TikTok) ===
${v.description_tiktok || ""}

=== AVANT DE PUBLIER ===
[ ] Activer l'étiquette « Contenu généré par l'IA » (voix de synthèse)
[ ] Sujet de votation ou sensible : pas de son tendance
[ ] Vérifier la couverture (image d'accroche)

=== SOURCES ===
${sources}

=== CONTRÔLE ===
Décision : ${v.decision}
${(v.problemes || []).map((p) => `- ${p.gravite} (scène ${p.scene}) : ${p.constat}`).join("\n") || "Aucune remarque."}
`;
  fs.writeFileSync(path.join(dossier, "publication.txt"), texte);
  // Le texte est aussi archivé dans le dépôt (sans la vidéo)
  fs.mkdirSync(path.join("publications", v.id), { recursive: true });
  fs.writeFileSync(path.join("publications", v.id, "publication.txt"), texte);

  const tag = `video-${v.id}`;
  // Médias d'origine (voix, photos) archivés pour pouvoir refaire le rendu plus tard (changement de charte, correction)
  const medias = [];
  try {
    const ep = JSON.parse(fs.readFileSync(path.join("episodes", `${v.id}.json`), "utf8"));
    for (const f of [ep.voice, ...ep.scenes.filter((s) => s.type === "photo" || s.type === "photoRonde" || s.type === "illustration").map((s) => s.props.src), ...ep.scenes.map((s) => s.fond_ia?.src)]) if (f && fs.existsSync(path.join("public", f))) medias.push(f);
  } catch {}
  const archiveMedias = path.join("out", "publications", `${nom}-medias.tgz`);
  if (medias.length) execFileSync("tar", ["-czf", archiveMedias, "-C", "public", ...medias]);
  gh("release", "create", tag, path.join(dossier, `${nom}.mp4`), path.join(dossier, "publication.txt"), ...(medias.length ? [archiveMedias] : []), "--title", v.titre || v.id, "--notes", texte, "--prerelease");
  const assets = JSON.parse(gh("release", "view", tag, "--json", "assets"));
  const lien = (ext) => (assets.assets.find((a) => a.name.endsWith(ext)) || {}).url;

  let lienDrive = null;
  // Drive : un dossier par jour, et uniquement les vidéos validées par le Contrôleur
  if (driveActif() && v.decision === "OK") {
    try {
      const { jour, base } = nomsDrive(v.id);
      lienDrive = await deposerSurDrive(jour, [
        { nom: `${base}.mp4`, url: lien(".mp4") },
        { nom: `${base}.txt`, url: lien(".txt") },
      ]);
      console.log("Déposé sur Drive :", lienDrive);
    } catch (e) {
      console.warn("Drive :", e.message);
    }
  }
  const problemes = (v.problemes || []).map((p) => `- **${p.gravite}** (scène ${p.scene}) : ${p.constat}`).join("\n") || "Aucune.";
  const body = `<!-- episode:${v.id} -->
**Édition du ${v.edition}**, à publier ${creneau(v.edition)}. Décision du Contrôleur : **${v.decision}**${v.cout_usd != null ? `\n💰 Coût de production estimé : ${v.cout_usd.toFixed(2)} $ (≈ ${(v.cout_usd * 0.8).toFixed(2)} CHF)` : ""}

▶️ [Voir la vidéo](${lien(".mp4")})
🎬 [Télécharger la vidéo](${lien(".mp4")}) · 📝 [Texte de publication](${lien(".txt")})
📝 [Texte de publication](${lien(".txt")})${lienDrive ? `\n📁 [Dossier sur Google Drive](${lienDrive})` : ""}

### Remarques du Contrôleur
${problemes}

### Texte de publication
<!-- description -->
${v.description_tiktok || ""}
<!-- /description -->

---
${v.etat === "a_valider" ? "Publie la vidéo sur TikTok depuis le dossier Drive (étiquette IA activée), puis commente **OK** ici pour l'archiver." : "⛔ Bloquée par le Contrôleur : à revoir avant toute publication."}`;
  fs.writeFileSync("out/issue.md", body);
  const lienIssue = gh("issue", "create", "--title", `🎬 ${v.titre || v.id}`, "--body-file", "out/issue.md", "--label", v.etat === "a_valider" ? "a-valider" : "bloque", "--assignee", process.env.GITHUB_REPOSITORY_OWNER || "@me");
  redaction.episode({ id: v.id, titre: v.titre, etat: v.etat, lien_video: lien(".mp4"), lien_drive: lienDrive, lien_issue: lienIssue });
  console.log("Dossier de publication prêt pour", v.id);
}
await redaction.fin();
