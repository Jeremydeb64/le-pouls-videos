// Dépôt des dossiers de publication dans Google Drive via un Google Apps Script (outils/apps-script-drive.gs).
// Secrets : DRIVE_WEBAPP_URL (URL de l'application Web) et DRIVE_SECRET (même valeur que la propriété SECRET du script).
// Sans ces secrets, l'étape est simplement ignorée.
export const driveActif = () => !!(process.env.DRIVE_WEBAPP_URL && process.env.DRIVE_SECRET);

// fichiers : [{ nom, url }] (URL publiques de la release GitHub)
// Accepte l'URL complète ou seulement l'ID de déploiement (AKfy…), avec espaces ou guillemets parasites.
const urlScript = () => {
  const v = (process.env.DRIVE_WEBAPP_URL || "").trim().replace(/^["']|["']$/g, "");
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
