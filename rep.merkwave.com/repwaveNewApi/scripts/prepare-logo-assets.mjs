import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const sourcePath = path.join(publicDir, "logo.png");
const wordmarkPath = path.join(publicDir, "logo-wordmark.png");
const iconPath = path.join(publicDir, "logo-icon.png");

async function main() {
  const meta = await sharp(sourcePath).metadata();
  const { width, height } = meta;

  // Keep icon + REPWAVE word only (~top 68% — drop tagline)
  const wordmarkHeight = Math.round(height * 0.68);
  await sharp(sourcePath)
    .extract({ left: 0, top: 0, width, height: wordmarkHeight })
    .trim()
    .png()
    .toFile(wordmarkPath);

  const wm = await sharp(wordmarkPath).metadata();
  const iconHeight = Math.min(115, wm.height - 1);
  await sharp(wordmarkPath)
    .extract({ left: 0, top: 0, width: wm.width, height: iconHeight })
    .resize(128, 128, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(iconPath);

  await sharp(iconPath)
    .resize(64, 64, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(publicDir, "favicon.png"));

  console.log("wordmark:", wm.width, "x", wm.height);
  console.log("Created logo-wordmark.png, logo-icon.png, favicon.png");
}

main().catch(console.error);
