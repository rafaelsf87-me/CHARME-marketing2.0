# SESSION_HANDOFF.md
## Handoff Entre Sessões de Desenvolvimento

**Como usar:** ao final de cada sessão de desenvolvimento, atualizar este arquivo com o estado atual. Ao iniciar nova sessão, ler primeiro este arquivo + `DIVIDAS_PROJETO.md`.

**Formato:** sessão mais recente no topo. Sessões antigas movidas para "Histórico" depois de 5 sessões mais novas.

---

## 📍 Estado Atual

**Fase:** Pré-desenvolvimento
**Última atualização:** 13/05/2026
**Próxima tarefa:** Detalhamento completo do M4 + Base do Sistema (em sessão de planejamento)

### Status por componente

| Componente | Status |
|---|---|
| SPEC.md | ✅ v0.2 |
| ARCHITECTURE.md | ✅ v0.2 |
| CLAUDE.md | ✅ v0.1 |
| GUIA_IMPLEMENTACAO.md | ⏳ Aguardando detalhamento M4 |
| Brand config | ⏳ Planejado, não implementado |
| Auth / Login | ⏳ Planejado, não implementado |
| Layout shell (sidebar + header) | ⏳ Planejado, não implementado |
| Dashboard `/` | ⏳ Planejado, não implementado |
| M1 Foto Produto | ⏳ Pendente — após M4, M2 |
| M2 Posts Instagram | ⏳ Pendente — após M4 |
| M3 Banners Website | ⏳ Pendente — após M1 |
| **M4 Thumbnails Feed** | 🎯 **Próximo a implementar** |
| M5 Banners Email | ⚪ Placeholder — a especificar |
| Template Creator | ⏳ Pendente — após módulos |

---

## 🚧 Bloqueios Ativos

Nenhum bloqueio crítico.

### Pendências menores
- Dimensões M3 desktop/mobile (Rafael confirmando com equipe)
- Ajuste visual da foto-template "Sofá 2" do M1 (remover overlay circular)

---

## 📝 Histórico de Sessões

### Sessão 0 — 12-13/05/2026 — Planejamento inicial
**O que foi feito:**
- SPEC.md v0.1 → v0.2 (consolidação de decisões)
- ARCHITECTURE.md v0.1 → v0.2 (stack atualizado, paleta consolidada, Vercel Hobby viável)
- CLAUDE.md v0.1 criado
- SESSION_HANDOFF.md v0.1 criado
- DIVIDAS_PROJETO.md criado (vazio)
- Decisões fechadas:
  - Paleta oficial: `#553679`, `#9569C8`, `#4CDDC3`, `#FEFEFC`
  - Fontes: Montserrat (M2, M3), Times New Roman MT (M4)
  - Logo SVG único (casinha quadrada)
  - Auth: NextAuth + Vercel Postgres + tela `/admin/usuarios`
  - Sem recuperação de senha — admin recria conta
  - Sem histórico de imagens — botão "Fazer Download" por geração
  - M1: Flux Kontext [Pro] como IA principal (sem A/B com GPT)
  - M1: fluxo simplificado — móvel vem da foto-template, sem input celular
  - M4: 3 variações posicionais (topo/centro/rodapé), dimensões 1080×1920
  - M5: placeholder via Edrone (100% a definir)
  - Estrutura de rotas: `/imagens/m{n}-*` (módulo principal + submódulos)
  - Sidebar fixa à esquerda, submódulo ativo em negrito (sem cor)
  - Dashboard: cards de módulos principais

**O que está em progresso:**
- Detalhamento do M4 + Base do Sistema (próximas sessões de planejamento)

**Próximos passos:**
1. Item 3 — Layout shell (sidebar, header, container)
2. Item 4 — Home/Dashboard
3. Item 5 — Componentes globais
4. Bloco B — Tela do submódulo M4
5. Bloco C — Especificação visual do template M4
6. Bloco D — Implementação técnica
7. Gerar GUIA_IMPLEMENTACAO.md final para Claude Code rodar

**Bloqueios encontrados:** nenhum.

---

## Template para próximas sessões

```
### Sessão N — DD/MM/AAAA — Título curto da sessão
**O que foi feito:**
- ...

**O que está em progresso:**
- ...

**Próximos passos:**
1. ...

**Bloqueios encontrados:**
- ...

**Dívidas registradas:** ver `DIVIDAS_PROJETO.md`
```
