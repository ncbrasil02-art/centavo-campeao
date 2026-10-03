# Paleta violeta em todo o site e validação dos fluxos

## Objetivo
Unificar a área pública com a direção escolhida “Grade neon”, mantendo o painel administrativo e as regras dos leilões intactos.

## Alterações visuais
- Trocar os tokens globais laranja/azul por fundo violeta profundo, superfícies violeta-escuras, destaque violeta elétrico e rosa somente para estados importantes.
- Aplicar Space Grotesk nos títulos e Inter nos textos, preservando legibilidade e contraste.
- Harmonizar navegação, rodapé, página inicial, cartões de leilão, detalhes, cadastro, pacotes, perfil, ranking e páginas informativas.
- Manter verde para sucesso, vermelho para urgência/erro e WhatsApp, sem comprometer o significado dos estados.
- Preservar no painel as opções existentes para personalizar cores por instalação; os novos padrões serão a base quando não houver configuração específica.

## Validação funcional
- Conferir carregamento e navegação em desktop e celular.
- Testar os formulários de login e cadastro sem criar dados descartáveis.
- Validar seleção de pacote e abertura das opções PIX/cartão, sem concluir cobrança real.
- Validar os controles de lance em leilão de centavos e de palpite em Menor Lance Único, evitando consumo indevido quando não houver uma conta de teste autorizada.
- Verificar erros visíveis, chamadas de rede relevantes e resultado da compilação automática.

## Detalhes técnicos
- Centralizar a identidade nos tokens semânticos globais para que componentes existentes adotem a paleta automaticamente.
- Substituir cores fixas conflitantes apenas nas telas públicas afetadas.
- Não alterar preços, saldos, agendamentos, pagamentos, robôs ou regras de negócio.
