// Re-rendu de vidéos déjà produites avec la charte actuelle (sans nouvelle voix ni nouveau script).
// IDS="id1 id2" node pipeline/rerendu.mjs
// Son : la piste voix d'origine si elle a été archivée (médias de la release), sinon l'audio complet de l'ancienne vidéo
// (voix + musique + effets déjà mixés, qu'on ne rajoute pas une deuxième fois) ; la signature sonore est ajoutée.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { rendre } from "./lib/rendu.mjs";
import { photoLibre } from "./lib/web.mjs";
import { driveActif, deposerSurDrive, nomsDrive } from "./lib/drive.mjs";

const gh = (...a) => execFileSync("gh", a, { encoding: "utf8" }).trim();
const sh = (cmd, ...a) => execFileSync(cmd, a, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
const ids = (process.env.IDS || process.argv.slice(2).join(" ")).split(/[\s,]+/).filter(Boolean);
fs.mkdirSync("work", { recursive: true });
const bilan = [];

for (const id of ids) {
  const tag = `video-${id}`;
  const nom = `LePouls_${id}`;
  const ep = JSON.parse(fs.readFileSync(`episodes/${id}.json`, "utf8"));
  const w = path.join("work", id);
  fs.rmSync(w, { recursive: true, force: true });
  fs.mkdirSync(w, { recursive: true });
  gh("release", "download", tag, "--dir", w, "--clobber");
  const fichiers = fs.readdirSync(w);
  const medias = fichiers.find((f) => f.endsWith("-medias.tgz"));
  if (medias) {
    // Voix et photos d'origine archivées : rendu complet, musique et effets refaits
    sh("tar", "-xzf", path.join(w, medias), "-C", "public");
    // Photo remplacée (src absent des médias archivés) : nouvelle recherche sur Wikimedia
    for (const [i, s] of ep.scenes.entries()) {
      if ((s.type !== "photo" && s.type !== "photoRonde") || !s.props.recherche || fs.existsSync(path.join("public", s.props.src || "_"))) continue;
      const f = path.join("public", s.props.src || `photo-${id}-${i}-b.jpg`);
      const p = await photoLibre(s.props.recherche, f).catch(() => null);
      if (p) s.props = { ...s.props, src: path.basename(f), credit: p.credit };
      else ep.scenes[i] = { ...s, type: "statement", props: { text: s.props.title || s.props.kicker || "", kicker: s.props.kicker } };
    }
  } else {
    const ancien = path.join(w, fichiers.find((f) => f.endsWith(".mp4")));
    const piste = `rerendu-${id}.mp3`;
    sh("npx", "remotion", "ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", ancien, "-vn", "-ar", "44100", "-b:a", "192k", path.join("public", piste));
    ep.voice = piste;
    ep.sonsIntegres = true;
    // Photos : on refait la même recherche sur Wikimedia Commons (licence libre, crédit affiché)
    for (const [i, s] of ep.scenes.entries()) {
      if (s.type !== "photo" && s.type !== "photoRonde") continue;
      if (s.props.src && fs.existsSync(path.join("public", s.props.src))) continue;
      const f = path.join("public", `photo-${id}-${i}.jpg`);
      const p = s.props.recherche ? await photoLibre(s.props.recherche, f).catch(() => null) : null;
      if (p) s.props = { ...s.props, src: path.basename(f), credit: p.credit };
      else ep.scenes[i] = { ...s, type: "statement", props: { text: s.props.title || s.props.kicker || "" } };
    }
  }
  const mp4 = path.join(w, `${nom}.mp4`);
  console.log("Rendu", id);
  await rendre(ep, mp4);
  // Release : nouvelle vidéo et nouveau dossier zip (même texte de publication)
  const dossier = path.join(w, nom);
  fs.mkdirSync(dossier, { recursive: true });
  fs.copyFileSync(mp4, path.join(dossier, `${nom}.mp4`));
  if (fs.existsSync(path.join(w, "publication.txt"))) fs.copyFileSync(path.join(w, "publication.txt"), path.join(dossier, "publication.txt"));
  gh("release", "upload", tag, mp4, "--clobber");
  // L'ancien dossier zip (doublon de la vidéo) n'est plus fourni
  for (const z of fichiers.filter((f) => f.endsWith(".zip"))) try { gh("release", "delete-asset", tag, z, "-y"); } catch {}
  const assets = JSON.parse(gh("release", "view", tag, "--json", "assets")).assets;
  const lien = (ext) => (assets.find((a) => a.name.endsWith(ext)) || {}).url;
  let lienDrive = null;
  if (driveActif()) {
    try {
      // Même dossier du jour et mêmes noms : la nouvelle version remplace l'ancienne
      const { jour, base } = nomsDrive(id);
      lienDrive = await deposerSurDrive(jour, [
        { nom: `${base}.mp4`, url: lien(".mp4") },
        { nom: `${base}.txt`, url: lien(".txt") },
      ]);
    } catch (e) {
      console.warn("Drive :", e.message);
    }
  }
  bilan.push({ id, video: lien(".mp4"), drive: lienDrive });
  console.log("OK", id, lien(".mp4"), lienDrive || "");
}
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/rerendu.json", JSON.stringify(bilan, null, 1));
process.exit(0);
