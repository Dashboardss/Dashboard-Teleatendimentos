# Dashboard Teleautônomo 2026

Dashboard estático, responsivo e pronto para GitHub Pages, gerado a partir da planilha `ESCALATELEAUTÔNOMO2026(2).xlsx`.

## Abrir localmente

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Conteúdo

- `index.html`: painel interativo com filtros por profissional, mês e unidade.
- `data.json`: dados agregados sem nome, CPF, telefone, cartão SUS, endereço ou data de nascimento.
- `atendimentos_agregados.csv`: registros operacionais anonimizados.
- `analise_2026.md`: resumo executivo e metodologia.
- `gerar_dashboard.py`: rotina reprodutível de consolidação.

## GitHub Pages

Envie os arquivos para um repositório e habilite Pages em **Settings → Pages → Deploy from a branch → main/root**.
