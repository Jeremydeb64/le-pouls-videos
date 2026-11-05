/**
 * Le Pouls : dépôt des dossiers de publication dans Google Drive + état en direct de la mini rédaction.
 * À coller dans un projet Google Apps Script (script.google.com), puis déployer en « Application Web ».
 * GitHub envoie : { secret, nom, fichiers: [{ nom, url }] } ; le script télécharge les fichiers
 * (vidéo + texte) depuis la release GitHub et les range dans CLAUDE / Le Pouls – publications / <nom>.
 */
const DOSSIER_PUBLICATIONS = "1Wq2z4OzxHN7htpRMcqgh_rMPbdRQsNxU"; // CLAUDE / Le Pouls – publications

// Lecture publique de l'état de la rédaction (pour la mini rédaction)
function doGet() {
  const statut = PropertiesService.getScriptProperties().getProperty("STATUT");
  return ContentService.createTextOutput(statut || "{}").setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty("SECRET");
    if (!secret || d.secret !== secret) return reponse({ ok: false, erreur: "secret invalide" });
    // Mise à jour de l'état de la rédaction (envoyé par le pipeline à chaque étape)
    if (d.action === "statut") {
      // Une propriété est limitée à 9 Ko : on retire les plus anciens messages si besoin
      let texte = JSON.stringify(d.statut);
      while (texte.length > 8800 && d.statut.messages && d.statut.messages.length) {
        d.statut.messages.shift();
        texte = JSON.stringify(d.statut);
      }
      PropertiesService.getScriptProperties().setProperty("STATUT", texte);
      return reponse({ ok: true });
    }
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

// ---------------------------------------------------------------------------
// Déclenchement fiable des éditions (les tâches planifiées de GitHub sont souvent retardées ou sautées).
// Propriété du script à ajouter : GITHUB_TOKEN = jeton GitHub « fine-grained », dépôt le-pouls-videos,
// permission « Actions : Read and write ». Puis exécuter une fois installerDeclencheurs().
function lancerEdition_(edition) {
  const jeton = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!jeton) throw new Error("Propriété GITHUB_TOKEN manquante");
  const r = UrlFetchApp.fetch("https://api.github.com/repos/Jeremydeb64/le-pouls-videos/actions/workflows/edition.yml/dispatches", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + jeton, Accept: "application/vnd.github+json" },
    payload: JSON.stringify({ ref: "main", inputs: { edition: edition, max_sujets: "1" } }),
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() !== 204) throw new Error("GitHub " + r.getResponseCode() + " : " + r.getContentText());
}
function editionMatin() { lancerEdition_("matin"); }
function editionSoir() { lancerEdition_("soir"); }

// À exécuter une seule fois : édition du matin entre 6 h et 7 h, du soir entre 16 h et 17 h (heure du projet Apps Script)
function installerDeclencheurs() {
  ScriptApp.getProjectTriggers().filter(function (t) { return /^edition(Matin|Soir)$/.test(t.getHandlerFunction()); }).forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("editionMatin").timeBased().everyDays(1).atHour(6).inTimezone("Europe/Zurich").create();
  ScriptApp.newTrigger("editionSoir").timeBased().everyDays(1).atHour(16).inTimezone("Europe/Zurich").create();
}
