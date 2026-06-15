// src/lib/tenant.ts
// Configuração do tenant ativo

export const TENANT_ID: string = (() => {
  const id = import.meta.env.VITE_TENANT_ID;
  if (!id) {
    console.warn('[tenant] VITE_TENANT_ID não definido. Usando "centavodomilhao".');
    return 'centavodomilhao';
  }
  return id as string;
})();

export function isTenant(id: string): boolean {
  return TENANT_ID === id;
}
