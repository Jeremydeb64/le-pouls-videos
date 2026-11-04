// Agent 4 — Diffuseur. Publication manuelle : la vidéo et son texte sont dans le dossier Drive.
// Commenter « OK » sur l'issue après publication l'archive.
import { redaction } from "./lib/redaction.mjs";
import fs from "node:fs";
const message = "Vidéo archivée comme publiée sur TikTok.";
redaction.dit("diffuseur", message);
redaction.agent("diffuseur", "attend");
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/diffusion.txt", message);
await redaction.fin();
