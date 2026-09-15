# Migração para um Supabase externo (conta própria)

Objetivo: tirar o sistema do banco gerenciado pelo Lovable e passar a usar um projeto Supabase criado na sua própria conta, sem perder dados.

## O que eu preciso que você providencie

1. **Projeto Supabase novo** criado na sua conta (região sugerida: São Paulo / us-east).
2. **Dados de conexão do projeto novo** (em Project Settings → API e Database):
   - URL do projeto (`https://xxxx.supabase.co`)
   - Chave pública (anon / publishable)
   - Chave de serviço (service role / secret)
   - ID do projeto (ref)
   - Senha do banco (para restaurar o backup)
3. **Confirmação sobre usuários**: se os logins existentes (incluindo o seu admin) devem ser migrados junto — isso exige exportar a tabela de contas com as senhas em hash.
4. **Provedores de login**: se usa entrada com Google, precisa reconfigurar no projeto novo (eu indico onde).
5. **Chaves de serviços externos** que hoje ficam guardadas no backend: Mercado Pago, SMTP2Go, chave de IA do atendimento. Precisam ser recadastradas no projeto novo.

## O que eu entrego

- **Exportação completa** do banco atual: estrutura (tabelas, regras de acesso, funções, gatilhos, agendamentos) + todos os dados, em arquivos `.sql` prontos para restaurar.
- **Exportação dos arquivos** do armazenamento (imagens de produtos, banners, logos) e script de reenvio para o projeto novo.
- **Script de importação** que roda na ordem certa: estrutura → dados → permissões → agendamentos (robôs de lance).
- **Troca da configuração do app** para apontar para o Supabase externo (URL e chaves), mantendo o mesmo código de acesso ao banco.
- **Checklist de validação** pós-migração: login, criação de leilão, lance, robôs, pagamento, e-mails, chat.

## Como será feito (técnico)

1. Gerar dump com `pg_dump` separado em `schema.sql`, `data.sql` e `auth.sql`.
2. Ajustar o dump: remover objetos gerenciados pelo Supabase, manter `public` + políticas RLS + `GRANT`s + funções `security definer`.
3. Restaurar no projeto novo via `psql` com a senha do banco.
4. Recriar buckets de storage e reenviar objetos via API.
5. Recadastrar segredos e reconfigurar `pg_cron`/`pg_net` para os robôs e finalização de leilões.
6. Atualizar `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `SUPABASE_*`) e `supabase/config.toml`.
7. Reimplantar as Edge Functions existentes (`auction-worker`, `create-mp-preference`, `mercadopago-pix`, `payment-webhook`, `notify-users`) no projeto novo.
8. Atualizar a URL do webhook do Mercado Pago para o novo endereço.

## Pontos de atenção

- Haverá uma **janela de indisponibilidade** curta (leilões em andamento devem ser pausados durante a cópia).
- O acesso do Lovable ao banco externo é mais limitado: mudanças futuras de estrutura passam a ser feitas por scripts, não pelo painel do Lovable.
- Senhas de usuários só migram se a tabela de contas for exportada junto; caso contrário todos precisam redefinir a senha.

## Próximo passo

Me envie os dados do item 2 (e as respostas dos itens 3 a 5) e eu já gero os arquivos de exportação e o script de importação.
