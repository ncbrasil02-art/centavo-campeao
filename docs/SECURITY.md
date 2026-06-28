# Relatório de Segurança & RPCs SECURITY DEFINER

_Última atualização: 2026-06-28_

## 1. Último scan automático

| Scanner | Findings | Status |
|---|---|---|
| `supabase` (RLS / DB) | 0 | ✅ Limpo |
| `supabase_lov` (Lovable Cloud) | 0 | ✅ Limpo |
| `connector_security_scan` (Wiz) | 0 | ✅ Limpo |
| `supply_chain` (deps / malware) | 0 | ✅ Limpo |

Workflows que mantêm isso verde:
- `.github/workflows/security-audit.yml` — `bun audit` diário e em PRs.
- `.github/workflows/post-deploy-scan.yml` — `bun audit` + `gitleaks` após cada deploy.

## 2. Por que usamos `SECURITY DEFINER`

PostgREST/Data API não aceita lógica composta com checks de autorização cruzando várias tabelas sem expor todas elas via RLS. Concentramos a autorização **dentro de cada RPC**, executando como owner com `search_path = public` travado, `EXECUTE` revogado de `anon`/`public` e concedido apenas para `authenticated` (+ `service_role` quando aplicável).

**Padrão obrigatório em toda RPC SECURITY DEFINER:**
1. `SET search_path = public` no cabeçalho.
2. Primeira linha do corpo: checagem de identidade (`auth.uid() IS NULL` → erro) e/ou papel (`public.is_admin()`).
3. `GRANT EXECUTE` apenas para os papéis necessários — nunca `anon`/`public`.
4. Toda ação administrativa chama `log_admin_action(...)` ou insere em `admin_audit_logs`.

## 3. Inventário das RPCs

### 3.1 Públicas autenticadas (`authenticated`)
| Função | O que faz | Autorização interna |
|---|---|---|
| `get_my_profile()` | Retorna o próprio profile | `auth.uid()` implícito |
| `get_my_winners()` | Leilões ganhos pelo usuário | `auth.uid() IS NOT NULL` |
| `get_my_unique_bids()` | Palpites do usuário no Menor Lance Único | `auth.uid() IS NOT NULL` |
| `get_my_unique_bid_status(campaign)` | Status/dica de faixa do usuário | `auth.uid()` |
| `get_my_bids_history(limit, offset)` | Histórico de lances | `auth.uid() IS NOT NULL` |
| `get_my_purchases()` | Pacotes comprados | `auth.uid() IS NOT NULL` |
| `get_my_tickets()` | Tickets de suporte | `auth.uid() IS NOT NULL` |
| `get_ticket_messages(ticket)` | Mensagens — owner ou admin | Checagem dupla |
| `reply_support_ticket(ticket, body)` | Responder ticket | Owner ou admin |
| `submit_winner_receipt(auction, url)` | Anexar comprovante | `auth.uid() IS NOT NULL` + match user |
| `get_winner_payment(auction)` | Status de pagamento | Owner ou admin |
| `place_bid(auction)` | Dar lance em leilão | Saldo + modalidade + status |
| `place_unique_bid(campaign, value)` | Palpite no Menor Lance Único | Exige pacote comprado |
| `pay_with_bid_balance(auction)` | Pagar com saldo de lances | É o ganhador |
| `track_user_presence(user, page)` | Heartbeat | `auth.uid()` |
| `get_server_time()` | Hora do servidor (sync cronômetro) | Pública por design |

### 3.2 Administrativas (checam `is_admin()`)
`get_admin_stats`, `get_admin_stats_v2`, `admin_list_profiles`, `admin_get_profile`, `admin_list_online_profiles`, `admin_list_robots`, `admin_list_claims`, `admin_get_winner_full`, `admin_update_winner_payment`, `confirm_auction_winner`, `admin_list_unique_campaigns`, `admin_get_unique_campaign_bids`, `admin_close_unique_campaign`, `admin_get_audit_logs`, `process_robot_bids_admin`, `increment_bid_balance`.

Toda ação destrutiva ou de saldo grava em `admin_audit_logs` via `log_admin_action()` ou `INSERT` direto.

### 3.3 Apenas `service_role` (webhooks / backend confiável)
`complete_payment`, `buy_credits`, `add_bids_to_user`, `expire_welcome_bids`, `log_admin_action`.

Nunca expostas ao client. Chamadas exclusivamente por edge functions, cron ou webhooks de pagamento autenticados.

### 3.4 Internas / triggers
`is_admin`, `check_is_admin`, `can_manage_banners`, `handle_auction_finished`, `handle_auction_slug`, `product_slug_trigger`, `handle_updated_at`, `protect_profile_sensitive_columns`, `slugify`, `ensure_live_auctions_robot_settings`, `place_robot_bid`.

`protect_profile_sensitive_columns` bloqueia escrita em `bid_balance`/`is_admin`/`is_bot` por qualquer caller `authenticated` — só RPCs com `set_config('app.allow_profile_update','true', true)` conseguem alterar.

## 4. Avisos esperados no scanner

O linter sinaliza "Signed-In Users Can Execute SECURITY DEFINER Function" para o grupo 3.1/3.2 — **comportamento esperado e desejado**: a autorização vive dentro da função (`auth.uid()` + `is_admin()`). Não tratar como bug.

## 5. Como adicionar uma nova RPC

```sql
CREATE OR REPLACE FUNCTION public.minha_rpc(p_arg uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  -- (admin? IF NOT public.is_admin() THEN RAISE EXCEPTION 'Não autorizado'; END IF;)
  -- lógica
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.minha_rpc(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.minha_rpc(uuid) TO authenticated;
-- ações de admin: também logar em admin_audit_logs
```
