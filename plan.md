# Plano — Painel de Atendimentos v2

## Produto
Aplicação web gerenciada para atualização recorrente de uma base de atendimentos por Excel, consulta operacional, exportação de relatórios e controle de acesso via Manus OAuth.

## Direção de design
- **Movimento:** editorial data workspace, com sensação de console operacional premium.
- **Princípios:** leitura rápida, hierarquia forte, baixa distração e transparência sobre qualidade dos dados.
- **Paleta:** azul profundo para confiança e navegação, ciano para realização, âmbar para atenção e coral para perdas; fundo frio e cartões claros para manter densidade sem cansaço.
- **Layout:** shell lateral compacto + tela de trabalho ampla; blocos de resumo no topo e módulos de análise abaixo, evitando aparência de planilha.
- **Assinaturas:** marca geométrica simples, chips de status e barras de progresso com números destacados.
- **Interação:** filtros persistentes, feedback de importação em etapas e prévia antes de confirmar qualquer alteração.
- **Animação:** transições curtas em hover e mudança de aba; sem animações decorativas que prejudiquem a leitura.
- **Tipografia:** sistema sans moderno, títulos compactos e números tabulares grandes.
- **Essência:** transformar uma rotina de planilha em uma operação auditável, segura e fácil de acompanhar. Personalidade: claro, confiável, pragmático.
- **Voz:** direta e operacional. Exemplos: “Atualize a base sem retrabalho.” e “Revise as inconsistências antes de publicar.”
- **Marca:** símbolo quadrado com eixo de dados ascendente; cor proprietária azul íris.

## Implementação
- Frontend React/Tailwind com páginas Dashboard, Importar, Relatórios e Acessos.
- Manus OAuth para autenticação; permissões administrativas respeitadas no servidor.
- Importação XLSX no navegador com biblioteca `xlsx`, sem enviar identificadores pessoais: normalizar e agregar apenas dimensões operacionais para a prévia e persistência.
- Persistência inicial no banco gerenciado para histórico de importações e snapshots agregados; as rotinas de schema ficam preparadas para evolução.
- Exportações CSV e impressão/PDF pelo navegador; relatório Excel a partir da mesma visão filtrada.
- Dados iniciais agregados da análise de 2026 incluídos como seed visual para a primeira abertura.
- Todas as interfaces e mensagens em português brasileiro.
