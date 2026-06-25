// src/lib/tenant.ts
// Detecta o tenant ativo em runtime pelo domínio da requisição.
// Para adicionar um novo domínio: inclua uma entrada no DOMAIN_TENANT_MAP abaixo.

const DOMAIN_TENANT_MAP: Record<string, string> = {
  // ── Domínios de produção ───────────────────────────────────────
  'centavodomilhao.online':      'centavodomilhao',
  'www.centavodomilhao.online':  'centavodomilhao',

  // ── Preview / staging Lovable ──────────────────────────────────
  'centavo-campeao.lovable.app': 'centavodomilhao',

  // ── Desenvolvimento local ──────────────────────────────────────
  'localhost':   'centavodomilhao',
  '127.0.0.1':  'centavodomilhao',

  // ── Novos domínios: descomente e ajuste ────────────────────────
  // 'novosite.com.br':     'novosite',
  // 'www.novosite.com.br': 'novosite',
};

function resolveTenantId(): string {
  // 1. Runtime (browser): detecta pelo hostname atual
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const tenant = DOMAIN_TENANT_MAP[hostname];
    if (tenant) return tenant;
    console.warn(
      `[tenant] Domínio não mapeado: "${hostname}". ` +
      'Adicione-o em DOMAIN_TENANT_MAP (src/lib/tenant.ts). ' +
      'Usando fallback "centavodomilhao".'
    );
  }

  // 2. Fallback: variável de ambiente (útil em SSR ou CI)
  const envId = import.meta.env.VITE_TENANT_ID as string | undefined;
  if (envId) return envId;

  return 'centavodomilhao';
}

export const TENANT_ID: string = resolveTenantId();

export function isTenant(id: string): boolean {
  return TENANT_ID === id;
}
