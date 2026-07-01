import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const logoPath = path.join(publicDir, "logo.png");
const logoOutPath = path.join(publicDir, "logo-no-bg.png");

function isBackground(r, g, b, a) {
  if (a < 10) return true;
  // Solid black / near-black background
  return r <= 28 && g <= 28 && b <= 28;
}

function idx(x, y, w) {
  return (y * w + x) * 4;
}

async function removeBackground(inputPath, outputPath) {
  const tempPath = outputPath.replace(/\.png$/i, ".transparent.tmp.png");

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const pixels = Buffer.from(data);
  const visited = new Uint8Array(width * height);
  const queue = [];

  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];

  for (const [x, y] of corners) {
    const i = idx(x, y, width);
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    if (isBackground(r, g, b, a)) {
      queue.push([x, y]);
      visited[y * width + x] = 1;
    }
  }

  while (queue.length) {
    const [x, y] = queue.pop();
    const i = idx(x, y, width);
    pixels[i + 3] = 0;

    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const vi = ny * width + nx;
      if (visited[vi]) continue;
      const pi = idx(nx, ny, width);
      if (isBackground(pixels[pi], pixels[pi + 1], pixels[pi + 2], pixels[pi + 3])) {
        visited[vi] = 1;
        queue.push([nx, ny]);
      }
    }
  }

  await sharp(pixels, {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(tempPath);

  const fs = await import("fs/promises");
  await fs.copyFile(tempPath, outputPath);
  await fs.unlink(tempPath).catch(() => {});

  console.log(`Saved transparent logo: ${outputPath}`);
  return { width, height };
}

async function createFavicon(sourcePath, outputPath, size = 64) {
  await sharp(sourcePath)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outputPath);
  console.log(`Saved favicon: ${outputPath}`);
}

const logoInfo = await removeBackground(logoPath, logoOutPath);
const fs = await import("fs/promises");
await fs.copyFile(logoOutPath, logoPath);
await createFavicon(logoOutPath, path.join(publicDir, "favicon.png"), 64);
await fs.unlink(logoOutPath).catch(() => {});
