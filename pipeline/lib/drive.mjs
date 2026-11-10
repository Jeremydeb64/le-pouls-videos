// Dépôt des dossiers de publication dans Google Drive via un Google Apps Script (outils/apps-script-drive.gs).
// Secrets : DRIVE_WEBAPP_URL (URL de l'application Web) et DRIVE_SECRET (même valeur que la propriété SECRET du script).
// Sans ces secrets, l'étape est simplement ignorée.
export const driveActif = () => !!process.env.DRIVE_SECRET;

// fichiers : [{ nom, url }] (URL publiques de la release GitHub)
// Accepte l'URL complète ou seulement l'ID de déploiement (AKfy…), avec espaces ou guillemets parasites.
// URL de l'application Web « Le Pouls Drive » (non secrète : c'est DRIVE_SECRET qui protège l'accès).
const URL_PAR_DEFAUT = "https://script.google.com/macros/s/AKfycby0pxEgRNfRiB09clLAMNDSJUUPMZ4oj5aZ7i3QP7IIYjH5V7lQMlgulkvTkx7tESi-Kg/exec";
const urlScript = () => {
  const v = (process.env.DRIVE_WEBAPP_URL_FORCEE || URL_PAR_DEFAUT).trim().replace(/^["']|["']$/g, "");
  return v.startsWith("http") ? v : `https://script.google.com/macros/s/${v}/exec`;
};

export async function deposerSurDrive(nom, fichiers) {
  const r = await fetch(urlScript(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret: (process.env.DRIVE_SECRET || "").trim(), nom, fichiers }),
    redirect: "follow",
  });
  const t = await r.text();
  let d;
  try {
    d = JSON.parse(t);
  } catch {
    throw new Error(`Réponse inattendue du script Drive (${r.status}) : ${t.slice(0, 200)}`);
  }
  if (!d.ok) throw new Error(`Script Drive : ${d.erreur}`);
  return d.lien;
}

// Rangement : dossier « AAAA-MM-JJ », fichiers « AAAA-MM-JJ_sujet-court.mp4 » et « .txt »
export function nomsDrive(id) {
  const jour = id.slice(0, 10);
  const sujet = id.slice(11).replace(/^(matin|soir|jour|midi|histoire)-/, "").split("-").slice(0, 6).join("-");
  return { jour, base: `${jour}_${sujet}` };
}
