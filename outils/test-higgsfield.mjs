// Sonde l'API Higgsfield (format de clé, endpoint, forme des réponses) avec une seule image bon marché.
const brut = (process.env.HIGGSFIELD_KEY || "").trim();
console.log("Clé présente :", !!brut, "longueur", brut.length, "contient ':' :", brut.includes(":"), "préfixe :", brut.slice(0, 4) + "…");
const [id, secret] = brut.includes(":") ? brut.split(":") : [brut, ""];
const auths = [
  ["Authorization Key", { Authorization: `Key ${brut}` }],
  ["Bearer", { Authorization: `Bearer ${brut}` }],
  ["hf-api-key/hf-secret", { "hf-api-key": id, "hf-secret": secret || id }],
];
const corps = { prompt: "Abstract editorial background, deep green and cream diagonal shapes, soft light, no text", aspect_ratio: "9:16", resolution: "2K" };
const endpoints = ["bytedance/seedream/v4/text-to-image", "higgsfield-ai/soul/standard", "flux-pro/kontext/max/text-to-image"];
let ok = null;
for (const ep of endpoints) {
  for (const [nom, h] of auths) {
    const r = await fetch(`https://platform.higgsfield.ai/${ep}`, { method: "POST", headers: { ...h, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(corps) });
    const t = await r.text();
    console.log(ep, "|", nom, "→", r.status, t.slice(0, 300));
    if (r.ok) { ok = { ep, nom, h, d: JSON.parse(t) }; break; }
  }
  if (ok) break;
}
if (ok) {
  const url = ok.d.status_url || `https://platform.higgsfield.ai/requests/${ok.d.request_id}/status`;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const r = await fetch(url, { headers: { ...ok.h, accept: "application/json" } });
    const t = await r.text();
    console.log("statut", r.status, t.slice(0, 600));
    if (/completed|failed|nsfw|canceled/.test(t)) break;
  }
}
