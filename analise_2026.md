# Análise de atendimentos — Teleautônomo 2026

Arquivo analisado: `ESCALATELEAUTÔNOMO2026(2).xlsx`

Escopo: **20 abas operacionais** de 2026. com **2.403 registros anonimizados**.

## Resumo executivo

- **Atendidos:** 1.621 (71.0% dos slots agendados considerados).
- **Não atendidos:** 99.
- **Cancelados + desistências:** 281.
- **Vagas livres:** 107.
- **Sem status:** 283; recomenda-se revisão antes de usar esse grupo como indicador de perda.

## Atendimentos por profissional

| Profissional | Atendidos | Não atendidos | Cancelados | Desistências | Sem status |
|---|---:|---:|---:|---:|---:|
| Dra. Camila Queiroga | 998 | 73 | 16 | 161 | 138 |
| Dra. Priscila Ferreira | 549 | 22 | 86 | 0 | 49 |
| Dras. Viridiana & Priscila | 74 | 4 | 18 | 0 | 96 |

## Atendimentos por mês

| Mês | Atendidos | Não atendidos | Cancelados | Desistências | Sem status |
|---|---:|---:|---:|---:|---:|
| 01/2026 | 148 | 14 | 28 | 0 | 1 |
| 02/2026 | 146 | 5 | 11 | 25 | 0 |
| 03/2026 | 193 | 3 | 17 | 29 | 2 |
| 04/2026 | 173 | 7 | 17 | 18 | 39 |
| 05/2026 | 176 | 2 | 6 | 23 | 25 |
| 06/2026 | 158 | 3 | 6 | 34 | 33 |
| 07/2026 | 199 | 0 | 9 | 23 | 26 |
| 08/2026 | 218 | 12 | 8 | 9 | 0 |
| 09/2026 | 146 | 48 | 17 | 0 | 38 |
| 10/2026 | 64 | 5 | 1 | 0 | 119 |

## Observações de qualidade dos dados

- O arquivo contém abas de modelo, consolidação e registros de 2025; elas foram excluídas do escopo operacional de 2026.
- Foram consideradas as 20 abas com mês de 2026 e profissional identificável.
- A análise não publica nome, CPF, cartão SUS, telefone, endereço ou data de nascimento.
- Alguns registros estão sem status ou com variações de grafia; o script normaliza “Não atendindo” para “Não atendido” e “Vagas livre(s)” para “Vagas livres”.
- A taxa de atendimento usa como denominador os registros que não são vagas livres, remanejamentos ou feriados.

## Arquivos

- `index.html`: dashboard interativo.
- `data.json`: dataset agregado, sem identificadores pessoais.
- `atendimentos_agregados.csv`: base operacional anonimizada para análises adicionais.
- `gerar_dashboard.py`: script reprodutível para atualizar o dashboard a partir de outro XLSX com a mesma estrutura.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie `index.html`, `data.json` e `atendimentos_agregados.csv` (o script é opcional).
3. Em **Settings → Pages**, selecione a branch principal e a pasta `/root`.
4. Acesse a URL gerada pelo GitHub Pages.

> O dashboard usa Chart.js via CDN. Para uma publicação totalmente offline, baixe a biblioteca e altere a tag `<script>` do `index.html`.
