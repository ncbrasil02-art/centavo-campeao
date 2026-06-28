#!/usr/bin/env bun
/**
 * Testes de autorização — executam contra o backend real usando a chave anon.
 * Verificam que RPCs sensíveis e tabelas privadas REJEITAM acesso anônimo.
 *
 * Uso:  bun run scripts/auth-tests.ts
 * CI:   .github/workflows/auth-tests.yml (diário + em PRs)
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL!;
const anonKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY!;

if (!url || !anonKey) {
  console.error("Faltam VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(2);
}

const sb = createClient(url, anonKey, { auth: { persistSession: false } });

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

const expectUnauthorized = async (name: string, run: () => Promise<{ error: unknown; data?: unknown }>) => {
  try {
    const { error, data } = await run();
    const msg = (error as { message?: string } | null)?.message ?? "";
    const blocked =
      !!error &&
      /not.?authoriz|não autorizado|permission denied|jwt|unauthenticated|row-level security/i.test(msg);
    // Algumas RPCs retornam {success:false} em vez de error
    const softBlocked =
      !error &&
      data &&
      typeof data === "object" &&
      "success" in (data as Record<string, unknown>) &&
      (data as { success: boolean }).success === false;
    const ok = blocked || softBlocked;
    results.push({ name, ok, detail: ok ? "bloqueado" : `LEAK: ${JSON.stringify(data) || "sem erro"}` });
  } catch (e) {
    results.push({ name, ok: true, detail: "exception (ok)" });
  }
};

// ---- RPCs que NÃO podem ser executadas por anon ----
const adminRpcs: Array<[string, Record<string, unknown>]> = [
  ["admin_list_profiles", { p_search: null, p_limit: 1, p_offset: 0 }],
  ["admin_list_claims", { p_search: null }],
  ["admin_list_unique_campaigns", {}],
  ["admin_list_robots", {}],
  ["admin_list_online_profiles", {}],
  ["admin_get_audit_logs", { p_limit: 10, p_offset: 0 }],
  ["confirm_auction_winner", { p_auction_id: "00000000-0000-0000-0000-000000000000" }],
  ["admin_update_winner_payment", { p_auction_id: "00000000-0000-0000-0000-000000000000", p_status: "approved" }],
  ["admin_close_unique_campaign", { p_campaign_id: "00000000-0000-0000-0000-000000000000" }],
  ["increment_bid_balance", { p_user_id: "00000000-0000-0000-0000-000000000000", p_amount: 9999 }],
  ["process_robot_bids_admin", {}],
];

const userRpcs: Array<[string, Record<string, unknown>]> = [
  ["get_my_profile", {}],
  ["get_my_winners", {}],
  ["get_my_bids_history", { p_limit: 1, p_offset: 0 }],
  ["get_my_purchases", {}],
  ["get_my_tickets", {}],
  ["get_my_unique_bids", {}],
  ["place_bid", { p_auction_id: "00000000-0000-0000-0000-000000000000" }],
  ["place_unique_bid", { p_campaign_id: "00000000-0000-0000-0000-000000000000", p_value: 1 }],
];

const serviceOnlyRpcs: Array<[string, Record<string, unknown>]> = [
  ["complete_payment", { p_transaction_id: "00000000-0000-0000-0000-000000000000" }],
  ["buy_credits", { p_package_id: "00000000-0000-0000-0000-000000000000" }],
  ["add_bids_to_user", { p_user_id: "00000000-0000-0000-0000-000000000000", p_amount: 9999 }],
  ["expire_welcome_bids", {}],
];

// ---- Tabelas privadas: leitura anon deve falhar/retornar vazio ----
const privateTables = [
  "admin_audit_logs",
  "profile_secrets",
  "winners",
  "transactions",
  "support_tickets",
  "support_messages",
  "robot_settings",
];

const run = async () => {
  for (const [fn, args] of [...adminRpcs, ...userRpcs, ...serviceOnlyRpcs]) {
    await expectUnauthorized(`rpc:${fn}`, () => sb.rpc(fn, args));
  }
  for (const t of privateTables) {
    const { data, error } = await sb.from(t).select("*").limit(1);
    const leaked = !error && Array.isArray(data) && data.length > 0;
    results.push({
      name: `select:${t}`,
      ok: !leaked,
      detail: leaked ? `LEAK: ${data.length} linha(s) visíveis a anon` : error ? "permission denied" : "RLS vazio",
    });
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\nAuthz tests: ${passed}/${results.length} passaram`);
  for (const r of results) {
    console.log(`  ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  if (failed.length) {
    console.error(`\n${failed.length} FALHA(S) — possível vazamento de autorização.`);
    process.exit(1);
  }
};

run();
