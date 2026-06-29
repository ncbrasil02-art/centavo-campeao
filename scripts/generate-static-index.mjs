import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const siteUrl = process.env.SITE_URL || "https://sistemaparaleilaocentavos.site/";
const serverEntryUrl = pathToFileURL(resolve(".output/server/index.js")).href;
const serverEntry = await import(serverEntryUrl);
const handler = serverEntry.default ?? serverEntry;

if (!handler || typeof handler.fetch !== "function") {
  throw new Error(".output/server/index.js does not export a fetch handler");
}

let currentUrl = siteUrl;
let response = await handler.fetch(new Request(currentUrl), {}, {});

for (let redirects = 0; response.status >= 300 && response.status < 400 && redirects < 5; redirects++) {
  const location = response.headers.get("location");

  if (!location) {
    break;
  }

  currentUrl = new URL(location, currentUrl).href;
  response = await handler.fetch(new Request(currentUrl), {}, {});
}

const html = await response.text();

if (!response.ok) {
  throw new Error(`Static index render failed with HTTP ${response.status}`);
}

if (!html.includes("/assets/")) {
  throw new Error("Static index render did not include built client assets");
}

await mkdir(".output/public", { recursive: true });
await writeFile(".output/public/index.html", html);

console.log(`Generated dist/client/index.html from ${currentUrl}`);
