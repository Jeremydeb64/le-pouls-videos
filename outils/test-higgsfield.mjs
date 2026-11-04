// Sonde l'API Higgsfield : image (Soul) puis animation courte (image vers vidéo), forme des réponses.
const H = { Authorization: `Key ${(process.env.HIGGSFIELD_KEY || "").trim()}`, "content-type": "application/json", accept: "application/json" };
const B = "https://platform.higgsfield.ai";
const attendre = async (d) => {
  const url = d.status_url || `${B}/requests/${d.request_id}/status`;
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const r = await fetch(url, { headers: H });
    const j = await r.json().catch(() => ({}));
    if (i % 4 === 0 || /completed|failed|nsfw|canceled/.test(j.status)) console.log("statut", r.status, JSON.stringify(j).slice(0, 700));
    if (/completed|failed|nsfw|canceled/.test(j.status)) return j;
  }
};
for (const u of ["/models", "/v1/models"]) {
  const r = await fetch(B + u, { headers: H });
  console.log("GET", u, r.status, (await r.text()).slice(0, 1500));
}
const t0 = Date.now();
let r = await fetch(`${B}/higgsfield-ai/soul/standard`, { method: "POST", headers: H, body: JSON.stringify({ prompt: "Abstract editorial background, deep green and cream diagonal shapes, soft light, no text", aspect_ratio: "9:16", resolution: "1080p" }) });
let d = await r.json();
console.log("image →", r.status, JSON.stringify(d).slice(0, 500));
const img = await attendre(d);
console.log("image en", Math.round((Date.now() - t0) / 1000), "s");
const urlImg = img?.images?.[0]?.url || img?.image?.url || JSON.stringify(img).match(/https:[^"]+\.(png|jpg|jpeg|webp)/)?.[0];
console.log("URL image :", urlImg);
if (urlImg) {
  for (const ep of ["higgsfield-ai/dop/standard", "kling-video/v2.1/standard/image-to-video", "minimax/hailuo-02/standard/image-to-video", "bytedance/seedance/v1/lite/image-to-video"]) {
    const t1 = Date.now();
    r = await fetch(`${B}/${ep}`, { method: "POST", headers: H, body: JSON.stringify({ prompt: "slow gentle parallax motion, shapes drifting", image_url: urlImg, duration: 5 }) });
    d = await r.json().catch(() => ({}));
    console.log("vidéo", ep, "→", r.status, JSON.stringify(d).slice(0, 500));
    if (r.ok) {
      const v = await attendre(d);
      console.log("vidéo en", Math.round((Date.now() - t1) / 1000), "s :", JSON.stringify(v).slice(0, 600));
      break;
    }
  }
}
