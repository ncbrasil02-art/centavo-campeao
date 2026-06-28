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

export const importFromMagalu = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => {
    if (!data?.url || typeof data.url !== "string") {
      throw new Error("URL inválida");
    }
    return data;
  })
  .handler(async ({ data }): Promise<ImportResult> => {
    const u = new URL(data.url.trim());
    // VTEX product URLs end with /p (optionally followed by query)
    // Pega o último segmento de path antes de /p
    const parts = u.pathname.split("/").filter(Boolean);
    const pIdx = parts.lastIndexOf("p");
    if (pIdx < 1) {
      throw new Error("Link inválido. Use o link direto do produto (termina em /p).");
    }
    const slug = parts[pIdx - 1];
    const apiUrl = `${u.origin}/api/catalog_system/pub/products/search/${slug}/p`;

    const res = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) throw new Error(`Falha ao carregar produto (${res.status})`);
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error("Produto não encontrado.");
    }
    const p = arr[0];
    const item = (p.items && p.items[0]) || {};
    const seller = (item.sellers && item.sellers[0]) || {};
    const offer = seller.commertialOffer || {};

    const name: string = p.productName || p.productTitle || "";
    const description = stripHtml(p.description || p.metaTagDescription || "");
    const price = Number(offer.Price ?? offer.ListPrice ?? 0) || 0;

    const images: string[] = (item.images || [])
      .map((i: any) => i.imageUrl)
      .filter(Boolean)
      .slice(0, 6);

    const cats: string[] = p.categories || [];
    const category =
      (cats[0] || "").split("/").filter(Boolean).slice(-1)[0] ||
      p.brand ||
      "";

    return { name, description, price, images, category };
  });
