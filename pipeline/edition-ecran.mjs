// Lance une édition sur cet ordinateur et affiche la mini rédaction dans le terminal pendant qu'elle tourne.
// Les journaux techniques sont écrits dans out/edition.log.
import fs from "node:fs";
import { spawn, fork } from "node:child_process";

fs.mkdirSync("out", { recursive: true });
const log = fs.openSync("out/edition.log", "w");
const edition = spawn(process.execPath, ["pipeline/edition.mjs"], { stdio: ["ignore", log, log], env: process.env });
const ecran = fork("pipeline/terminal.mjs", ["--local", "--jusqua-fin"], { stdio: "inherit" });

edition.on("exit", (code) => {
  setTimeout(() => {
    ecran.kill("SIGTERM");
    console.log(code === 0 ? "\nÉdition terminée. Journal : out/edition.log" : `\nL'édition s'est arrêtée (code ${code}). Journal : out/edition.log`);
    process.exit(code ?? 0);
  }, 3000);
});
process.on("SIGINT", () => {
  edition.kill("SIGINT");
  ecran.kill("SIGTERM");
  process.exit(130);
});
