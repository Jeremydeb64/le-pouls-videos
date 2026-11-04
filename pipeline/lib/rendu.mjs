// Rendu Remotion d'un épisode + images clés pour le Contrôleur.
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";


const browserExecutable = process.env.CHROME_PATH || null; // sur GitHub, Remotion télécharge son navigateur
// Le bundle copie public/ : on le refait pour chaque épisode afin d'inclure la voix et les photos du jour.
const caches = new Map();
const prepare = async (id = "x") => {
  if (!caches.has(id)) caches.set(id, await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") }));
  return caches.get(id);
};

export async function rendre(episode, sortie) {
  const url = await prepare(episode.id);
  const inputProps = { episode, withVoice: true };
  const composition = await selectComposition({ serveUrl: url, id: "Episode", inputProps, browserExecutable });
  await renderMedia({ composition, serveUrl: url, codec: "h264", outputLocation: sortie, inputProps, crf: 20, browserExecutable, concurrency: os.cpus().length });
  return sortie;
}

// Une image au milieu de chaque scène (et une au tout début)
export async function imagesCles(episode, dossier) {
  const url = await prepare(episode.id);
  const inputProps = { episode, withVoice: false };
  const composition = await selectComposition({ serveUrl: url, id: "Episode", inputProps, browserExecutable });
  fs.mkdirSync(dossier, { recursive: true });
  const fichiers = [];
  const instants = [0.4, ...episode.scenes.map((s) => s.from + Math.min(3.5, (s.to - s.from) * 0.7))];
  for (const [i, t] of instants.entries()) {
    const f = path.join(dossier, `cle-${String(i).padStart(2, "0")}.jpeg`);
    await renderStill({ composition, serveUrl: url, frame: Math.min(Math.round(t * 30), composition.durationInFrames - 1), output: f, inputProps, imageFormat: "jpeg", jpegQuality: 70, scale: 0.5, browserExecutable });
    fichiers.push(f);
  }
  return fichiers;
}
