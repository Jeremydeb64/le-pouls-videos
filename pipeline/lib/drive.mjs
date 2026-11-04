// Dépôt des dossiers de publication dans Google Drive (dossier CLAUDE / Le Pouls – publications).
// Nécessite un jeton OAuth du compte Google (secrets GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN).
// Sans ces secrets, l'étape est simplement ignorée.
import fs from "node:fs";
import path from "node:path";

const DOSSIER = process.env.DRIVE_FOLDER_ID || "1Wq2z4OzxHN7htpRMcqgh_rMPbdRQsNxU";

export const driveActif = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);

async function jeton() {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`Google OAuth ${r.status} : ${JSON.stringify(d)}`);
  return d.access_token;
}

async function creerDossier(tok, nom, parent) {
  const r = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${tok}`, "content-type": "application/json" },
    body: JSON.stringify({ name: nom, mimeType: "application/vnd.google-apps.folder", parents: [parent] }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`Drive dossier ${r.status} : ${JSON.stringify(d)}`);
  return d;
}

async function envoyer(tok, fichier, parent, type) {
  const debut = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
    method: "POST",
    headers: { Authorization: `Bearer ${tok}`, "content-type": "application/json; charset=UTF-8", "X-Upload-Content-Type": type },
    body: JSON.stringify({ name: path.basename(fichier), parents: [parent] }),
  });
  if (!debut.ok) throw new Error(`Drive envoi ${debut.status} : ${await debut.text()}`);
  const r = await fetch(debut.headers.get("location"), { method: "PUT", headers: { "content-type": type }, body: fs.readFileSync(fichier) });
  if (!r.ok) throw new Error(`Drive envoi ${r.status} : ${await r.text()}`);
}

// Copie le dossier local (vidéo + publication.txt) dans un sous-dossier Drive ; renvoie le lien.
export async function deposerSurDrive(dossierLocal) {
  const tok = await jeton();
  const d = await creerDossier(tok, path.basename(dossierLocal), DOSSIER);
  for (const f of fs.readdirSync(dossierLocal)) {
    const type = f.endsWith(".mp4") ? "video/mp4" : "text/plain";
    await envoyer(tok, path.join(dossierLocal, f), d.id, type);
  }
  return d.webViewLink;
}
