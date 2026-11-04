/**
 * Le Pouls : dépôt des dossiers de publication dans Google Drive.
 * À coller dans un projet Google Apps Script (script.google.com), puis déployer en « Application Web ».
 * GitHub envoie : { secret, nom, fichiers: [{ nom, url }] } ; le script télécharge les fichiers
 * (vidéo + texte) depuis la release GitHub et les range dans CLAUDE / Le Pouls – publications / <nom>.
 */
const DOSSIER_PUBLICATIONS = "1Wq2z4OzxHN7htpRMcqgh_rMPbdRQsNxU"; // CLAUDE / Le Pouls – publications

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty("SECRET");
    if (!secret || d.secret !== secret) return reponse({ ok: false, erreur: "secret invalide" });
    const racine = DriveApp.getFolderById(DOSSIER_PUBLICATIONS);
    const existants = racine.getFoldersByName(d.nom);
    const dossier = existants.hasNext() ? existants.next() : racine.createFolder(d.nom);
    for (const f of d.fichiers) {
      const blob = UrlFetchApp.fetch(f.url, { followRedirects: true }).getBlob().setName(f.nom);
      dossier.createFile(blob);
    }
    return reponse({ ok: true, lien: dossier.getUrl() });
  } catch (err) {
    return reponse({ ok: false, erreur: String(err) });
  }
}

function reponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// À lancer une fois depuis l'éditeur pour autoriser l'accès à Drive et aux téléchargements.
function testerAcces() {
  Logger.log(DriveApp.getFolderById(DOSSIER_PUBLICATIONS).getName());
  Logger.log(UrlFetchApp.fetch("https://github.com").getResponseCode());
}
