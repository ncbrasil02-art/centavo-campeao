import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const siteUrl = process.env.SITE_URL || "https://sistemaparaleilaocentavos.site/";
const serverEntryUrl = pathToFileURL(resolve("dist/server/server.js")).href;
const serverEntry = await import(serverEntryUrl);
const handler = serverEntry.default ?? serverEntry;

if (!handler || typeof handler.fetch !== "function") {
  throw new Error("dist/server/index.js does not export a fetch handler");
}

const response = await handler.fetch(new Request(siteUrl), {}, {});
const html = await response.text();

if (!response.ok) {
  throw new Error(`Static index render failed with HTTP ${response.status}`);
}

if (!html.includes("/assets/")) {
  throw new Error("Static index render did not include built client assets");
}

await mkdir("dist/client", { recursive: true });
await writeFile("dist/client/index.html", html);

console.log(`Generated dist/client/index.html from ${siteUrl}`);
