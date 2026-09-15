# Migração para Supabase externo (conta própria)

Este guia + scripts levam o sistema do banco gerenciado pelo Lovable para um projeto
Supabase criado na sua conta, sem perder dados.

---

## 1. O que você precisa ter em mãos

Do **projeto novo** (painel Supabase → Project Settings):

| Item | Onde encontrar |
|---|---|
| URL do projeto (`https://xxxx.supabase.co`) | Settings → API |
| Chave pública (anon / publishable) | Settings → API |
| Chave de serviço (service role / secret) | Settings → API |
| Ref do projeto (`xxxx`) | Settings → General |
| String de conexão do banco + senha | Settings → Database → Connection string (URI) |

Decisões a confirmar:

- **Usuários/logins**: migrar as contas existentes (senhas continuam funcionando) ou
  pedir que todos redefinam a senha?
- **Login com Google**: precisa ser reconfigurado no projeto novo (Authentication → Providers).
- **Chaves de terceiros** a recadastrar no projeto novo: Mercado Pago, SMTP2Go, chave de IA
  do atendimento.

---

## 2. Exportar os dados atuais

A estrutura do banco (tabelas, políticas de acesso, funções, gatilhos) **já está versionada**
neste projeto, em `supabase/migrations/` (229 arquivos, em ordem cronológica).
O script abaixo junta tudo em um único arquivo pronto para restaurar:

```bash
bash docs/migracao-supabase-externo/scripts/build-schema.sh
# gera: /tmp/migracao/schema.sql
```

Os **dados** (linhas das tabelas) e os **usuários** saem pela exportação oficial:

> Painel do Lovable → **Cloud → Advanced settings → Export data**

Isso entrega o dump completo do banco atual. Guarde os arquivos numa pasta local.

---

## 3. Restaurar no projeto novo

```bash
export TARGET_DB_URL='postgresql://postgres:SENHA@db.xxxx.supabase.co:5432/postgres'

# 3.1 estrutura
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f /tmp/migracao/schema.sql

# 3.2 dados (arquivo vindo da exportação)
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f ./export/data.sql
```

Se a exportação vier em um único arquivo, restaure só ele e pule o passo 3.1.

---

## 4. Copiar os arquivos (imagens de produtos, banners, logos)

```bash
export SOURCE_SUPABASE_URL='https://jqwnzcuvslqpltjwawyr.supabase.co'
export SOURCE_SERVICE_KEY='<service role do projeto atual>'
export TARGET_SUPABASE_URL='https://xxxx.supabase.co'
export TARGET_SERVICE_KEY='<service role do projeto novo>'

bun docs/migracao-supabase-externo/scripts/copy-storage.ts
```

O script recria os buckets com a mesma visibilidade e copia todos os objetos.

---

## 5. Apontar o sistema para o projeto novo

Edite `.env` na raiz:

```
SUPABASE_PROJECT_ID="<ref novo>"
SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<anon novo>"
VITE_SUPABASE_PROJECT_ID="<ref novo>"
VITE_SUPABASE_URL="https://xxxx.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon novo>"
VITE_TENANT_ID="centavodomilhao"
```

E `supabase/config.toml`:

```
project_id = "<ref novo>"
```

A chave de serviço (`SUPABASE_SERVICE_ROLE_KEY`) vai nos segredos do ambiente de execução,
nunca no código.

---

## 6. Reimplantar as funções de servidor

No projeto novo, publique as Edge Functions que já existem em `supabase/functions/`:

```bash
supabase link --project-ref <ref novo>
supabase functions deploy auction-worker create-mp-preference mercadopago-pix payment-webhook notify-users
```

Segredos que cada função espera (Settings → Edge Functions → Secrets):
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, credenciais do Mercado Pago,
credenciais do SMTP2Go e a chave de IA do atendimento.

---

## 7. Reativar os automatismos (robôs e fechamento de leilão)

No SQL Editor do projeto novo:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

Depois recrie os agendamentos que chamam `tick_auctions` / `process_robot_bids`
(eles estão nas migrations, confira com `grep -l cron.schedule supabase/migrations/*`).
Atualize a URL usada pelo agendamento para o domínio do projeto novo.

---

## 8. Atualizar integrações externas

- **Mercado Pago**: trocar a URL do webhook para o endereço da função no projeto novo.
- **SMTP2Go**: nenhuma mudança de credencial, apenas recadastrar no projeto novo.
- **Domínios/tenants**: cada instalação continua usando `VITE_TENANT_ID`.

---

## 9. Checklist de validação

- [ ] Login com e-mail/senha funciona (incluindo o admin)
- [ ] Painel `/admin` abre
- [ ] Criar produto + criar leilão
- [ ] Dar lance e ver atualização em tempo real
- [ ] Robôs dando lance nos segundos finais
- [ ] Finalização de leilão e registro de vencedor
- [ ] Compra de pacote de lances (Mercado Pago / PIX)
- [ ] E-mail de cadastro e de recuperação de senha
- [ ] Chat de atendimento
- [ ] Imagens de produtos e banners carregando

---

## Pontos de atenção

- Pause os leilões em andamento durante a cópia (há uma janela curta de indisponibilidade).
- Após a troca, mudanças de estrutura passam a ser feitas por scripts SQL no projeto novo,
  não mais pelo painel do Lovable.
- As senhas dos usuários só continuam valendo se as contas forem migradas junto na exportação.
