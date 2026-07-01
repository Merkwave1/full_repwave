import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const SOURCE =
  process.env.LOGO_SOURCE ||
  path.join(
    process.env.USERPROFILE || "",
    ".cursor",
    "projects",
    "d-full-repwave-full-repwave",
    "assets",
    "c__Users_Future_AppData_Roaming_Cursor_User_workspaceStorage_6e719b55640f3adeaffa34beb4d811c0_images_REPWAVE__2_-585a3b0e-9bfc-4583-b58b-6cb0a7892c31.png",
  );

const OUT_DIRS = [
  path.join(root, "public"),
  path.join(root, "..", "rep.merkwave.com", "repwaveNewApi", "public"),
];

async function removeBlackBg(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < 35 && g < 35 && b < 35) data[i + 3] = 0;
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png();
}

async function writeLogoAssets(outDir) {
  const source = globalThis.__LOGO_SOURCE || SOURCE;
  fs.mkdirSync(outDir, { recursive: true });
  const transparent = await removeBlackBg(source);
  const meta = await transparent.metadata();
  const wordmarkBuf = await transparent.toBuffer();

  // R icon only — ~16% width, no trim (trim was cutting the shape)
  const iconWidth = Math.max(Math.round(meta.width * 0.16), 140);
  const iconBuf = await sharp(wordmarkBuf)
    .extract({ left: 0, top: 0, width: iconWidth, height: meta.height })
    .extend({
      top: 12,
      bottom: 12,
      left: 12,
      right: 12,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const faviconBuf = await sharp(iconBuf)
    .resize(64, 64, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const appleBuf = await sharp(iconBuf)
    .resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const files = {
    "repwave-logo.png": wordmarkBuf,
    "logo.png": wordmarkBuf,
    "logo-wordmark.png": wordmarkBuf,
    "repwave-logo-icon.png": iconBuf,
    "logo-icon.png": iconBuf,
    "favicon.png": faviconBuf,
    "apple-touch-icon.png": appleBuf,
  };

  for (const [name, buf] of Object.entries(files)) {
    fs.writeFileSync(path.join(outDir, name), buf);
  }
}

async function main() {
  const source = fs.existsSync(SOURCE)
    ? SOURCE
    : path.join(root, "public", "repwave-logo-source.png");
  if (!fs.existsSync(source)) {
    throw new Error(`Logo source not found: ${source}`);
  }
  globalThis.__LOGO_SOURCE = source;
  for (const dir of OUT_DIRS) {
    await writeLogoAssets(dir);
    console.log("Wrote logo assets →", dir);
  }

  const iconBuf = fs.readFileSync(path.join(root, "public", "repwave-logo-icon.png"));
  const icon512 = await sharp(iconBuf)
    .resize(512, 512, { fit: "contain", background: { r: 250, g: 250, b: 254, alpha: 1 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(root, "app", "icon.png"), icon512);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
