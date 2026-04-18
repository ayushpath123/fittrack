import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** DM Sans 700 as WOFF (not woff2) — Satori only accepts `wOFF` / TTF. Vendored under `assets/fonts`. */
export async function loadDmSans700ForOg(): Promise<ArrayBuffer> {
  const buf = await readFile(join(process.cwd(), "assets/fonts/DMSans-Bold.woff"));
  return new Uint8Array(buf).buffer;
}
