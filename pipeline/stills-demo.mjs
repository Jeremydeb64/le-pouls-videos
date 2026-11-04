import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
const frames = process.argv.slice(2).map(Number);
const serveUrl = await bundle({ entryPoint: "src/index.ts" });
const composition = await selectComposition({ serveUrl, id: "Episode", browserExecutable: "/usr/bin/google-chrome" });
for (const f of frames) {
  await renderStill({ serveUrl, composition, frame: f, output: `out/f${String(f).padStart(4,"0")}.png`, browserExecutable: "/usr/bin/google-chrome" });
  console.log("ok", f);
}
