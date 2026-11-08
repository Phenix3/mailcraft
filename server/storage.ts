// Local-disk storage for MailCraft media library uploads.
// Files live under ./uploads and are served by Express at /uploads/{key}.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

/**
 * Write `data` to `uploads/{relKey}` and return the storage key plus the
 * public URL served by the app.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  // Defensive: never escape the uploads directory.
  const target = path.resolve(UPLOAD_DIR, key);
  if (!target.startsWith(UPLOAD_DIR + path.sep)) {
    throw new Error("Invalid storage key");
  }

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);

  return { key, url: `/uploads/${key}` };
}
