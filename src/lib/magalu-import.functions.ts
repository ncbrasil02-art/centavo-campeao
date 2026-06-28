import { createServerFn } from "@tanstack/react-start";

type ImportResult = {
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findProductNode(node: any): any | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const f = findProductNode(n);
      if (f) return f;
    }
    return null;
  }
  if (typeof node === "object") {
    const t = node["@type"];
    if (t === "Product" || (Array.isArray(t) && t.includes("Product"))) return node;
    if (node["@graph"]) return findProductNode(node["@graph"]);
  }
  return null;
}

export const importFromMagalu = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => {
    if (!data?.url || typeof data.url !== "string") {
      throw new Error("URL inválida");
    }
    return data;
  })
  .handler(async ({ data }): Promise<ImportResult> => {
    const res = await fetch(data.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`Falha ao carregar página (${res.status})`);
    const html = await res.text();

    // Parse all JSON-LD blocks
    const ldRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let product: any = null;
    let m: RegExpExecArray | null;
    while ((m = ldRegex.exec(html)) !== null) {
      try {
        const json = JSON.parse(m[1].trim());
        const p = findProductNode(json);
        if (p) {
          product = p;
          break;
        }
      } catch {
        // ignore malformed blocks
      }
    }

    if (!product) {
      throw new Error("Produto não encontrado na página. Cole o link direto do produto.");
    }

    const name: string = product.name || "";
    let description: string = product.description || "";
    description = stripHtml(description);

    // Images
    let imgs: string[] = [];
    const im = product.image;
    if (Array.isArray(im)) imgs = im.filter((x) => typeof x === "string");
    else if (typeof im === "string") imgs = [im];
    else if (im && typeof im === "object" && im.url) imgs = [im.url];
    imgs = imgs.map((u) => (u.startsWith("//") ? `https:${u}` : u)).slice(0, 6);

    // Price (offers can be object or array)
    let price = 0;
    const offers = product.offers;
    const pick = Array.isArray(offers) ? offers[0] : offers;
    if (pick) {
      const p = pick.price ?? pick.lowPrice ?? pick.highPrice;
      if (p != null) price = Number(p) || 0;
    }

    const category: string = product.category || product.brand?.name || "";

    return { name, description, price, images: imgs, category };
  });
