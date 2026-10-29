import sharp from "sharp";
import fs from "node:fs/promises";
import crypto from "node:crypto";
const scenes = JSON.parse(await fs.readFile("src/scenes.json", "utf8"));
await fs.mkdir("public/media", { recursive: true });
const assets = [];
const missing = [];
for (const scene of scenes) {
  for (const orientation of ["desktop", "mobile"]) {
    const stem = `${String(scene.id).padStart(2, "0")}-${orientation}`,
      original = `assets/originals/${stem}.png`;
    try {
      await fs.access(original);
    } catch {
      missing.push(original);
      continue;
    }
    const metadata = await sharp(original).metadata();
    const optimized = `public/media/${stem}.webp`,
      thumbnail = `public/media/${stem}-thumb.webp`;
    await sharp(original)
      .resize({
        width: orientation === "desktop" ? 1920 : 1080,
        withoutEnlargement: true,
      })
      .webp({ quality: 83, effort: 5 })
      .toFile(optimized);
    await sharp(original)
      .resize({
        width: orientation === "desktop" ? 480 : 320,
        withoutEnlargement: true,
      })
      .webp({ quality: 68, effort: 5 })
      .toFile(thumbnail);
    const hash = crypto
      .createHash("sha256")
      .update(await fs.readFile(original))
      .digest("hex");
    assets.push({
      ...scene,
      orientation,
      original,
      optimized: optimized.replace("public", ""),
      thumbnail: thumbnail.replace("public", ""),
      width: metadata.width,
      height: metadata.height,
      sha256: hash,
      bytes: (await fs.stat(original)).size,
      optimizedBytes: (await fs.stat(optimized)).size,
      source: "Built-in image_gen; separately generated composition",
      prompt: `Use case: stylized-concept. Original high quality dreamcore artwork for STILL. ${scene.description}. ${orientation === "desktop" ? "Landscape 16:9 wide composition" : "Portrait 9:16 tall composition, deliberately designed vertical scene, not a crop"}. Highest available quality; serene warm ethereal blue purple pastel; quiet center; no people, text, logos, watermark, horror.`,
    });
  }
}
await fs.writeFile(
  "ASSET_MANIFEST.json",
  JSON.stringify(
    {
      version: 1,
      imageCount: assets.length,
      expectedImageCount: 64,
      missing,
      storage: {
        optimized: "GitHub + Workers static assets",
        originals:
          "GitHub originals; optional R2 backup via npm run media:upload",
        r2Binding: "MEDIA",
        r2Prefix: "originals/",
      },
      images: assets,
      audio: ["ocean", "rain", "wind", "fire", "piano", "night"].map((id) => ({
        id,
        path: `/audio/${id}.mp3`,
        durationSeconds: 48,
        license: "CC0-1.0",
        provenance:
          "Original synthesized sound design; scripts/generate-audio.py; no third-party samples",
      })),
    },
    null,
    2,
  ) + "\n",
);
console.log(`Optimized ${assets.length}/64 images. Missing ${missing.length}.`);
