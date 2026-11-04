// Liste des modèles de l'API Higgsfield (sans rien générer) : slug, type, prix de base, schéma d'entrée.
const H = { Authorization: `Key ${(process.env.HIGGSFIELD_KEY || "").trim()}`, accept: "application/json" };
const B = "https://platform.higgsfield.ai";
const items = [];
for (let page = 1; page <= 5; page++) {
  const r = await fetch(`${B}/models?page=${page}&size=100&limit=100`, { headers: H });
  const d = await r.json();
  items.push(...(d.items || []));
  if (items.length >= (d.total || 0) || !(d.items || []).length) break;
}
const vus = new Set();
for (const m of items) {
  if (vus.has(m.slug)) continue;
  vus.add(m.slug);
  console.log("MODELE", m.output_type, "|", m.slug, "|", m.base_credits, "|", (m.operation_type || []).join(","), "|", (m.description || "").slice(0, 90));
}
for (const slug of ["higgsfield-ai/soul/standard", ...items.filter((m) => /seedance|kling|hailuo|dop|wan/.test(m.slug) && /image-to-video/.test(m.slug)).slice(0, 4).map((m) => m.slug)]) {
  const r = await fetch(`${B}/models/${slug}`, { headers: H });
  console.log("SCHEMA", slug, r.status, (await r.text()).slice(0, 1800));
}
