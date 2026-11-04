// Schémas d'entrée des modèles retenus : un POST vide renvoie les champs attendus (422), sans rien facturer.
const H = { Authorization: `Key ${(process.env.HIGGSFIELD_KEY || "").trim()}`, accept: "application/json", "content-type": "application/json" };
const B = "https://platform.higgsfield.ai";
for (const slug of ["recraft/v4.1/text-to-image", "higgsfield-ai/soul/standard", "alibaba/qwen-image-3/text-to-image", "kling-video/v4.0-flash/image-to-video", "kling-video/v3.0-turbo/image-to-video", "bytedance/seedance-2.5/image-to-video"]) {
  for (const corps of [{}, { prompt: "x", image_url: "https://example.com/x.jpg", aspect_ratio: "zz", resolution: "zz", duration: 999 }]) {
    const r = await fetch(`${B}/${slug}`, { method: "POST", headers: H, body: JSON.stringify(corps) });
    console.log("SCHEMA", slug, r.status, (await r.text()).slice(0, 1500));
  }
}
const r = await fetch(`${B}/balance`, { headers: H }).catch(() => null);
console.log("SOLDE", r?.status, r ? (await r.text()).slice(0, 300) : "");
for (const u of ["/account", "/v1/balance", "/credits", "/billing/balance", "/me"]) {
  const x = await fetch(B + u, { headers: H });
  console.log("SOLDE", u, x.status, (await x.text()).slice(0, 200));
}
