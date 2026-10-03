# Restaurar acesso administrativo e validar criação de leilões

## Objetivo
Garantir que `ncbrasil02@gmail.com` entre no painel administrativo e consiga criar leilões normalmente.

## Alterações
- Corrigir o redirecionamento após o login para preservar o destino `/admin`, inclusive quando vier como endereço completo.
- Centralizar a autorização administrativa em uma função segura do banco, sem depender de IDs fixos no navegador.
- Criar a tabela separada de funções de usuário, registrar a conta informada como administradora e manter compatibilidade com as permissões atuais.
- Ajustar a proteção do painel para consultar essa autorização e exibir uma mensagem clara se a verificação falhar.

## Validação
- Confirmar que a conta está ativa, confirmada e marcada como administradora.
- Testar login, abertura de `/admin` e `/admin/auctions`.
- Criar um leilão de teste pelo formulário, confirmar que aparece na lista e remover apenas esse registro de teste ao final.
- Conferir que o site continua abrindo sem falhas.

## Detalhes técnicos
- A estrutura do arquivo anexado coincide com a versão atual nas partes de autenticação e painel; ele não contém dados adicionais de usuários.
- O banco atual está saudável e a conta já existe, mas o fluxo de login descarta o destino administrativo quando recebe uma URL completa.
- A autorização será baseada em uma tabela `user_roles` protegida por regras de acesso e consultada por uma função segura no banco.
