// Lecture de pages, de flux RSS et recherche de photos libres (Wikimedia Commons).
import fs from "node:fs";

const UA = "LePoulsVideos/1.0 (+https://github.com/Jeremydeb64/le-pouls-videos)";

export async function lire(url) {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml,application/json" } });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
}

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));

// Texte lisible d'un article (sans script, menu, pied de page).
export function texteArticle(html) {
  let h = html.replace(/<(script|style|nav|footer|header|aside|form|noscript)[\s\S]*?<\/\1>/gi, " ");
  const art = h.match(/<article[\s\S]*?<\/article>/i);
  if (art) h = art[0];
  return decode(h.replace(/<\/(p|h\d|li|div)>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, 30000);
}

export async function rss(url) {
  const x = await lire(url);
  return [...x.matchAll(/<item[\s\S]*?<\/item>/g)].map((m) => {
    const g = (t) => decode((m[0].match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`)) || [])[1] || "").replace(/<[^>]+>/g, "").trim();
    return { titre: g("title"), url: g("link"), date: g("pubDate"), resume: g("description").slice(0, 400), flux: url };
  });
}

// Photos libres : licences acceptées uniquement, crédit construit automatiquement.
const LICENCES_OK = /^(cc0|cc by(-sa)? [0-9.]+|cc by(-sa)?|public domain|pd)/i;

export async function photoLibre(requete, destination) {
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=12" +
    `&gsrsearch=${encodeURIComponent(requete + " filetype:bitmap")}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1280`;
  const d = JSON.parse(await lire(api));
  const pages = Object.values(d.query?.pages || {});
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii || ii.width < 1000) continue;
    const m = ii.extmetadata || {};
    const licence = (m.LicenseShortName?.value || "").trim();
    if (!LICENCES_OK.test(licence)) continue;
    const auteur = (m.Artist?.value || "auteur inconnu").replace(/<[^>]+>/g, "").trim().slice(0, 60);
    const r = await fetch(ii.thumburl, { headers: { "user-agent": UA } });
    if (!r.ok) continue;
    fs.writeFileSync(destination, Buffer.from(await r.arrayBuffer()));
    return { fichier: destination, credit: `Photo : ${auteur} / Wikimedia Commons, ${licence}`, page: ii.descriptionurl };
  }
  return null;
}
