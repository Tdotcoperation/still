import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
const manifest = JSON.parse(await fs.readFile("ASSET_MANIFEST.json", "utf8"));
const bucket = process.env.STILL_R2_BUCKET || "still-media";
if (!/^[a-z0-9-]+$/.test(bucket)) throw new Error("Invalid bucket name");
for (const image of manifest.images) {
  const key = `originals/${image.original.split("/").at(-1)}`;
  const result = spawnSync(
    "npx",
    [
      "wrangler",
      "r2",
      "object",
      "put",
      `${bucket}/${key}`,
      "--file",
      image.original,
      "--content-type",
      "image/png",
      "--remote",
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
