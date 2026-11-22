// Reads real product pages through clipItem and prints what came back, so page
// reading can be checked without the app or a database.
//
//   npx tsx --env-file=.env.local --conditions=react-server scripts/test-clip.mts <url or file of urls>...
//
// Set CLIP_CACHE to a folder to keep each fetched page on disk, so a re-run
// after a code change does not fetch (and pay for) the same page again.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { clipItem } from "../src/lib/clip";

const cacheDir = process.env.CLIP_CACHE;
if (cacheDir) {
  await mkdir(cacheDir, { recursive: true });
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const target = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!target.includes("api.firecrawl.dev") || typeof init?.body !== "string") return realFetch(input, init);
    const file = join(cacheDir, `${createHash("sha1").update(init.body).digest("hex")}.json`);
    if (existsSync(file)) return new Response(await readFile(file, "utf8"), { status: 200 });
    const res = await realFetch(input, init);
    const body = await res.text();
    if (res.ok) await writeFile(file, body);
    return new Response(body, { status: res.status });
  };
}

const urls: string[] = [];
for (const arg of process.argv.slice(2)) {
  if (/^https?:\/\//.test(arg)) urls.push(arg);
  else urls.push(...(await readFile(arg, "utf8")).split("\n").map((l) => l.trim()).filter((l) => /^https?:\/\//.test(l)));
}
if (!urls.length) {
  console.error("Give one or more product links, or a file with one link per line.");
  process.exit(1);
}

const results: unknown[] = new Array(urls.length);
let next = 0;
async function worker() {
  while (next < urls.length) {
    const i = next++;
    const started = Date.now();
    try {
      const { images, ...fields } = await clipItem({ url: urls[i] });
      results[i] = { url: urls[i], seconds: Math.round((Date.now() - started) / 1000), ...fields, image_count: images.length, first_image: images[0] ?? null };
    } catch (err) {
      results[i] = { url: urls[i], seconds: Math.round((Date.now() - started) / 1000), error: err instanceof Error ? err.message : String(err) };
    }
    console.error(`done ${i + 1}/${urls.length}: ${urls[i]}`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log(JSON.stringify(results, null, 1));
