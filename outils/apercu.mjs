// Planche d'aperçu : une image par scène pour un ou plusieurs épisodes.
// node outils/apercu.mjs <id> [<id>...]  → out/apercu/<id>.jpg
import fs from "node:fs";
import { execSync } from "node:child_process";
import { imagesCles } from "../pipeline/lib/rendu.mjs";
for (const id of process.argv.slice(2)) {
  const ep = JSON.parse(fs.readFileSync(`episodes/${id}.json`, "utf8"));
  const dossier = `out/apercu/${id}`;
  fs.rmSync(dossier, { recursive: true, force: true });
  const f = await imagesCles(ep, dossier);
  const n = f.length;
  execSync(`ffmpeg -y -loglevel error -pattern_type glob -i '${dossier}/cle-*.jpeg' -vf "scale=270:480,tile=${Math.min(6, n)}x${Math.ceil(n / 6)}:padding=8:color=0x888888" -frames:v 1 out/apercu/${id}.jpg`);
  console.log(`out/apercu/${id}.jpg (${n} images)`);
}
process.exit(0);
