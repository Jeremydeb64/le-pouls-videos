// Test hors ligne du calage sous-titres / scènes (données réelles de l'épisode Crans-Montana).
import assert from "node:assert";
import { alignerSousTitres, caleScenes } from "./lib/voix.mjs";

const w = (text, start, end) => ({ text, start, end, type: "word" });
const mots = [
  w("[intrigued]", 0, 0.069), w("Dans", 0.08, 0.24), w("quatre-vingt-neuf", 0.4, 1.04), w("jours,", 1.12, 1.68),
  w("le", 1.76, 1.84), w("monde", 1.92, 2.16), w("du", 2.24, 2.32), w("ski", 2.48, 2.64), w("aura", 2.76, 2.88), w("les", 2.96, 3.04), w("yeux", 3.08, 3.28),
  w("braqués", 3.4, 3.76), w("sur", 3.84, 3.92), w("le", 3.96, 4.0), w("Valais.", 4.08, 4.8),
  w("[warm]", 4.816, 4.864), w("Salut,", 4.88, 5.36), w("c'est", 5.387, 5.44), w("Lucie,", 5.52, 6.08),
  w("[energetic]", 17.78, 17.82), w("six", 19.947, 20.0), w("cents", 20.12, 20.24), w("athlètes,", 20.36, 20.88),
];
const segments = [
  { dit: "Dans quatre-vingt-neuf jours,", affiche: "Dans 89 jours," },
  { dit: "le monde du ski aura les yeux", affiche: "le monde du ski aura les yeux" },
  { dit: "braqués sur le Valais.", affiche: "braqués sur le Valais." },
  { dit: "Salut, c'est Lucie,", affiche: "Salut, c'est Lucie," },
  { dit: "six cents athlètes,", affiche: "600 athlètes," },
];
const { sousTitres, ecart } = alignerSousTitres(segments, mots);
console.log(sousTitres, "écart", ecart);
assert.deepStrictEqual(sousTitres[0], [0.08, 1.68, "Dans 89 jours,"]);
assert.deepStrictEqual(sousTitres[4], [19.95, 20.88, "600 athlètes,"]);
assert.strictEqual(ecart, 0);

const scenes = caleScenes(
  [
    { type: "chrono", from: { seg: 0 }, theme: "paper", props: { value: 89 } },
    { type: "titleBib", from: { seg: 3 }, theme: "green", props: {} },
    { type: "stats", from: { seg: 4 }, theme: "green", props: { items: [{ value: 600, at: { seg: 4 } }] } },
  ],
  sousTitres,
  25
);
console.log(JSON.stringify(scenes));
assert.strictEqual(scenes[0].from, 0);
assert.strictEqual(scenes[1].from, 4.78);
assert.strictEqual(scenes[2].to, 25);
assert.strictEqual(scenes[2].props.items[0].at, 0.1);
console.log("Calage OK");
