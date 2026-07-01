/**
 * Restore portfolio images from originals — no bg removal or cropping.
 * Run: node scripts/process-public-images.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

function copyIfExists(from, to) {
  const src = path.join(publicDir, from);
  const dest = path.join(publicDir, to);
  if (!fs.existsSync(src)) {
    console.warn(`Skip (missing): ${from}`);
    return;
  }
  fs.copyFileSync(src, dest);
  console.log(`${from} → ${to}`);
}

// Hero containers — bg-removed assets from public/
copyIfExists("container en bg removed.png", "Container.png");
copyIfExists("arbg removed.png", "ContainerAr.png");

// Mission section — full warehouse photo, no bg erase
copyIfExists("purple boxes.png", "purple-boxes.png");

console.log("Done — originals restored (no processing).");
